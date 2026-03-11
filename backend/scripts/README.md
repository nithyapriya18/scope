# Document Generator Script

Generates physical Word, Excel, and PowerPoint files from Verity Scope structured content.

## Installation

```bash
pip install -r requirements.txt
```

## Dependencies

- **python-docx** - Word document generation
- **openpyxl** - Excel spreadsheet generation
- **python-pptx** - PowerPoint presentation generation
- **psycopg2-binary** - PostgreSQL database connection

## Usage

### Generate Documents

```bash
python3 generate_documents.py <document-id-1> <document-id-2> ...
```

### Example

```bash
# Generate all 4 documents for a project
python3 generate_documents.py \
  abc123-proposal-id \
  def456-sow-id \
  ghi789-pricing-id \
  jkl012-presentation-id
```

### Get Document IDs

```sql
-- Query to get document IDs for an opportunity
SELECT id, document_type
FROM documents
WHERE pricing_pack_id IN (
  SELECT id FROM pricing_packs
  WHERE wbs_id IN (
    SELECT id FROM wbs
    WHERE hcp_shortlist_id IN (
      SELECT id FROM hcp_shortlists
      WHERE sample_plan_id IN (
        SELECT id FROM sample_plans
        WHERE scope_id IN (
          SELECT id FROM scopes
          WHERE brief_id IN (
            SELECT id FROM briefs
            WHERE opportunity_id = '<your-opportunity-id>'
          )
        )
      )
    )
  )
);
```

## Output

Generated files are saved to:
```
backend/generated_documents/
├── PharmaCorp_Proposal_20260302_143022.docx
├── PharmaCorp_SOW_20260302_143023.docx
├── PharmaCorp_Pricing_20260302_143024.xlsx
└── PharmaCorp_Presentation_20260302_143025.pptx
```

## Document Types

### 1. Proposal (Word DOCX)
- Cover page with PetaSight branding
- Executive summary
- Company background
- Understanding of requirements
- Proposed methodology
- Sample plan
- Project team
- Timeline
- Pricing summary
- Appendices

**Length**: ~15-20 pages

### 2. Statement of Work (Word DOCX)
- Project overview
- Scope of services
- Deliverables
- Client responsibilities
- Project management
- Acceptance criteria
- Terms and conditions

**Length**: ~8-12 pages

### 3. Pricing Pack (Excel XLSX)
- **Tab 1: Summary** - Total price, payment schedule, budget comparison
- **Tab 2: Detailed Breakdown** - Itemized costs by category
- **Tab 3: Assumptions** - Inclusions, exclusions, notes

### 4. Capabilities Presentation (PowerPoint PPTX)
- Cover slide
- Agenda
- Understanding Your Needs
- Our Approach
- Investment/Pricing
- Next Steps

**Length**: 10-15 slides

## Branding

All documents use PetaSight brand colors:
- **Primary**: #da365c (magenta)
- **Secondary**: #1e40af (blue)
- **Accent**: #34d399 (emerald)

## Database Integration

The script:
1. Reads structured content from `documents` table
2. Generates physical files
3. Updates `documents.file_path` with generated file location

## Error Handling

- Validates document existence in database
- Checks for required fields in JSON content
- Provides detailed error messages with stack traces
- Returns non-zero exit code on failure

## Example Output

```
================================================================================
📄 Verity Scope Document Generator
================================================================================

🚀 Generating document ID: abc123-def4-5678-90ab-cdef12345678
📄 Generating Proposal DOCX: PharmaCorp_Proposal_20260302_143022.docx
✅ Proposal saved: /path/to/generated_documents/PharmaCorp_Proposal_20260302_143022.docx

🚀 Generating document ID: def456-abc7-8901-23de-f456789abcde
📄 Generating SOW DOCX: PharmaCorp_SOW_20260302_143023.docx
✅ SOW saved: /path/to/generated_documents/PharmaCorp_SOW_20260302_143023.docx

🚀 Generating document ID: ghi789-bcd0-1234-56ef-789012345678
📊 Generating Pricing Pack XLSX: PharmaCorp_Pricing_20260302_143024.xlsx
✅ Pricing Pack saved: /path/to/generated_documents/PharmaCorp_Pricing_20260302_143024.xlsx

🚀 Generating document ID: jkl012-cde3-4567-89ab-012345678901
📊 Generating Presentation PPTX: PharmaCorp_Presentation_20260302_143025.pptx
✅ Presentation saved: /path/to/generated_documents/PharmaCorp_Presentation_20260302_143025.pptx

================================================================================
✅ Generated 4/4 documents
📁 Output directory: /path/to/generated_documents
================================================================================
```

## Troubleshooting

### Import Errors
```bash
# Ensure all dependencies installed
pip install -r requirements.txt
```

### Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in script (DB_CONFIG)
```

### Empty Documents
- Verify structured content exists in `documents.document_content`
- Check JSON format matches expected structure

## Future Enhancements

- [ ] Custom templates support
- [ ] Multi-language generation
- [ ] PDF export
- [ ] Batch processing with progress bar
- [ ] CLI arguments for output directory
- [ ] Template customization per client
