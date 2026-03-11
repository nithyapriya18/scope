/**
 * QualityGateService - Validates agent outputs before workflow progression
 *
 * Quality gates ensure data integrity between workflow steps:
 * - Schema validation (required fields, min/max values)
 * - Business rule validation (margin thresholds, feasibility checks)
 * - Blocks progression if validation fails
 */

import { getSql } from '../lib/sql.js';
import { BidState } from './bidStateService.js';

export interface ValidationRule {
  field: string;
  rule: 'required' | 'min_length' | 'max_length' | 'min_value' | 'max_value' | 'equals' | 'confidence_threshold';
  threshold?: number;
  value?: any;
}

export interface QualityCheck {
  check: string;
  passed: boolean;
  actual: any;
  expected: string;
  message: string;
}

export interface QualityGate {
  id: string;
  gate_code: string;
  from_step: string;
  to_step: string;
  validation_rules: ValidationRule[];
  blocking: boolean;
}

class QualityGateService {
  /**
   * Execute quality gate validation
   */
  async executeGate(gateCode: string, bidState: BidState): Promise<{
    passed: boolean;
    checks: QualityCheck[];
  }> {
    const sql = getSql();

    // Load gate definition
    const gateResult = await sql`
      SELECT * FROM quality_gates WHERE gate_code = ${gateCode}
    `;

    if (gateResult.length === 0) {
      console.warn(`⚠️ Quality gate not found: ${gateCode} - skipping validation`);
      return { passed: true, checks: [] };
    }

    const gate: QualityGate = gateResult[0] as unknown as QualityGate;
    const checks: QualityCheck[] = [];

    // Execute each validation rule
    for (const rule of gate.validation_rules) {
      const check = await this.validateRule(rule, bidState);
      checks.push(check);
    }

    // Determine if gate passed
    const failed = checks.filter(c => !c.passed);
    const passed = gate.blocking ? failed.length === 0 : true;

    // Log execution to database
    await sql`
      INSERT INTO quality_gate_executions (bid_state_id, gate_code, status, checks)
      VALUES (
        (SELECT id FROM bid_states WHERE opportunity_id = ${bidState.opportunityId}),
        ${gateCode},
        ${passed ? 'passed' : 'failed'},
        ${JSON.stringify(checks)}
      )
    `;

    if (passed) {
      console.log(`✅ Quality gate passed: ${gateCode} (${checks.length} checks)`);
    } else {
      console.error(`❌ Quality gate failed: ${gateCode} - ${failed.length} checks failed`);
      failed.forEach(f => console.error(`   - ${f.message}`));
    }

    return { passed, checks };
  }

  /**
   * Validate individual rule
   */
  private async validateRule(rule: ValidationRule, bidState: BidState): Promise<QualityCheck> {
    const { field, rule: ruleType, threshold, value } = rule;
    const actualValue = this.getFieldValue(bidState, field);

    switch (ruleType) {
      case 'required':
        return {
          check: `${field} is required`,
          passed: actualValue != null && actualValue !== '',
          actual: actualValue,
          expected: 'non-empty',
          message: actualValue ? `✓ ${field} present` : `✗ Missing required field: ${field}`
        };

      case 'min_length':
        const arrayLength = Array.isArray(actualValue) ? actualValue.length : 0;
        return {
          check: `${field} minimum length`,
          passed: arrayLength >= (threshold || 0),
          actual: arrayLength,
          expected: `>= ${threshold}`,
          message: arrayLength >= (threshold || 0)
            ? `✓ ${field} has ${arrayLength} items`
            : `✗ ${field} has only ${arrayLength} items, expected at least ${threshold}`
        };

      case 'max_length':
        const maxArrayLength = Array.isArray(actualValue) ? actualValue.length : 0;
        return {
          check: `${field} maximum length`,
          passed: maxArrayLength <= (threshold || Infinity),
          actual: maxArrayLength,
          expected: `<= ${threshold}`,
          message: maxArrayLength <= (threshold || Infinity)
            ? `✓ ${field} has ${maxArrayLength} items`
            : `✗ ${field} has ${maxArrayLength} items, expected at most ${threshold}`
        };

      case 'min_value':
        const minValue = typeof actualValue === 'number' ? actualValue : 0;
        return {
          check: `${field} minimum value`,
          passed: minValue >= (threshold || 0),
          actual: minValue,
          expected: `>= ${threshold}`,
          message: minValue >= (threshold || 0)
            ? `✓ ${field} = ${minValue}`
            : `✗ ${field} = ${minValue}, expected at least ${threshold}`
        };

      case 'max_value':
        const maxValue = typeof actualValue === 'number' ? actualValue : 0;
        return {
          check: `${field} maximum value`,
          passed: maxValue <= (threshold || Infinity),
          actual: maxValue,
          expected: `<= ${threshold}`,
          message: maxValue <= (threshold || Infinity)
            ? `✓ ${field} = ${maxValue}`
            : `✗ ${field} = ${maxValue}, expected at most ${threshold}`
        };

      case 'equals':
        return {
          check: `${field} equals expected value`,
          passed: actualValue === value,
          actual: actualValue,
          expected: value,
          message: actualValue === value
            ? `✓ ${field} = "${value}"`
            : `✗ ${field} = "${actualValue}", expected "${value}"`
        };

      case 'confidence_threshold':
        const confidence = typeof actualValue === 'number' ? actualValue : 0;
        return {
          check: `${field} confidence score`,
          passed: confidence >= (threshold || 0),
          actual: confidence,
          expected: `>= ${threshold}`,
          message: confidence >= (threshold || 0)
            ? `✓ Confidence ${(confidence * 100).toFixed(0)}% meets threshold`
            : `✗ Confidence ${(confidence * 100).toFixed(0)}% below threshold ${((threshold || 0) * 100).toFixed(0)}%`
        };

      default:
        return {
          check: `${field} validation`,
          passed: false,
          actual: actualValue,
          expected: 'unknown',
          message: `✗ Unknown validation rule: ${ruleType}`
        };
    }
  }

  /**
   * Get nested field value from BidState using dot notation
   */
  private getFieldValue(bidState: BidState, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = bidState;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get gate execution history for opportunity
   */
  async getGateExecutions(opportunityId: string): Promise<any[]> {
    const sql = getSql();

    const result = await sql`
      SELECT qge.*, qg.from_step, qg.to_step, qg.blocking
      FROM quality_gate_executions qge
      JOIN quality_gates qg ON qge.gate_code = qg.gate_code
      WHERE qge.bid_state_id = (SELECT id FROM bid_states WHERE opportunity_id = ${opportunityId})
      ORDER BY qge.created_at ASC
    `;

    return result;
  }
}

// Export singleton instance
export const qualityGateService = new QualityGateService();
