# How to Create Test User Profiles in Apricot 360 (A360)

This document describes the process for creating test participant profiles in Apricot 360 (A360), including how to create family households with linked child records. It was written based on the hands-on creation of the NAVA Thomas test user set.

---

## Overview

A360 uses two distinct record types for household data:

- **Participant Profile** (`form_id=99`): One record per individual. Stores name, DOB, ethnicity, language, gender, address, special needs, etc.
- **Family Profile** (`form_id=98`): Links multiple Participant Profiles together into a household. Contains a "primary family member" name and a table of associated participants with their relationship roles (Mother, Son, Daughter, etc.).

To create a simple adult participant with no household linkage, you only need a Participant Profile. To create a parent-child household, you need both a Family Profile and individual Participant Profiles for each household member.

---

## Part 1: Creating a Standalone Participant Profile

Use this for adult participants (Parent or Other type) with no children to link in A360.

### Steps

1. Log in to A360 at `apricot.socialsolutions.com`.
2. Navigate to: **My Apricot → Search Records → Participant Profile → New Participant Profile**
   - Or use the direct URL: `/document/edit/id/new/form_id/99/`
3. Fill in the required fields (marked with `*`):
   - **Participant name**: First, Middle (optional), Last
   - **Date of birth**: MM/DD/YYYY
   - **Participant type**: Parent / Child / Other
   - **Ethnicity**: Select one (e.g., Hispanic/Latino, White, Asian)
   - **Primary language spoken at home**: Select one (e.g., English, Spanish)
   - **Special needs**: Yes or No
     - If Yes, a **Notes on special needs** text field appears — enter a brief description (e.g., "Mobility limitations — uses wheelchair")
4. Fill in optional fields as needed:
   - **Gender**: Male / Female / Non-binary / etc.
   - **Marital status**: Single / Married or domestic partner / etc.
   - **Address**: Street, City, State, Zip (use `638 Test Blvd` as the standard test address; vary City and Zip by profile)
5. **Save the record** by clicking the "Save Record" button in the Record Options panel (right sidebar), or use this JavaScript workaround if the button click fails:
   ```javascript
   document.querySelector('button[type="submit"]').click()
   ```
   > **Note:** Clicking the Save Record button directly sometimes triggers a `chrome-extension://` URL error when using Claude in Chrome. The JavaScript workaround bypasses this.
6. After saving, click **Continue** in the "Record Saved" dialog to reload and see the assigned **Record ID**.
7. Note the Record ID — it is system-assigned and needed for the test data spreadsheet and any family linkage.

---

## Part 2: Creating a Family Profile with Linked Children

Use this when a participant has children who also need Participant Profiles in A360.

### Step 1: Create the Parent's Participant Profile

Follow Part 1 to create the parent's record. Note the **Record ID** assigned by A360.

### Step 2: Create a Family Profile Linked to the Parent

1. Navigate to the parent's Participant Profile in A360.
2. In the right sidebar under **Record Options**, click **New Family Profile**.
   - Or use the direct URL: `/document/edit/id/new/form_id/98/parent_id/0/link_field_id/1954/link_id/[PARENT_RECORD_ID]`
   - Replace `[PARENT_RECORD_ID]` with the parent's actual Record ID.
3. Fill in the **Name of primary family member** fields (First, Middle, Last).
4. **Save the Family Profile** before proceeding. Click Save Record (or use the JS workaround).
   - The Family Profile gets its own Record ID (e.g., `339753`).
   > **Critical:** You must save the Family Profile before attempting to create children from it. Clicking "+ Add" → "Create New" on an unsaved profile will show a "Please save the current record first" error.

### Step 3: Create Child Participant Profiles via the Family Profile

1. On the saved Family Profile, scroll to **Associated Family Members**.
2. Click the **+ Add** button. A "Participant Profile Search" dialog opens.
3. In the dialog, click **"Create New"** (not "Link All" or a search result).
   - This opens a new tab with a pre-linked Participant Profile form:
     `/document/edit/id/new/form_id/99/parent_id/0/link_field_id/1953/link_id/[FAMILY_PROFILE_ID]`
4. Fill in the child's Participant Profile (see Part 1 for field details). Use **Child** as the Participant type.
5. Save the child record. The child is automatically linked to the Family Profile upon creation.
   - A notification confirms: `"Link Added (Child Name)"`
6. Note the child's Record ID.
7. Repeat Steps 2–6 for each additional child.

### Step 4: Set Relationship Roles on the Family Profile

After all children are created and linked:

1. Return to the Family Profile tab.
2. In the **Associated Family Members** table, each linked participant has a **"Participant relationship to family"** dropdown.
3. Set the dropdown for each child: **Son**, **Daughter**, etc.
4. The parent's relationship is typically set to **Mother** or **Father** and may already be pre-filled.
5. Save the Family Profile again to commit the relationship values.

---

## Part 3: Key Technical Notes

### Dynamic Element References

When using browser automation (e.g., Claude in Chrome), element `ref_NNN` identifiers expire after any page navigation or reload. Always use the `find` tool to get fresh references after navigating rather than reusing previously found refs.

### Save Record Button Workaround

Clicking the Save Record button via automation can fail with:
```
Cannot access a chrome-extension:// URL of different extension
```
Use this JavaScript workaround instead:
```javascript
document.querySelector('button[type="submit"]').click()
```

### Zip Code Field

The Zip field may display "required to complete this field" validation styling even after a valid value is entered. This is a display artifact — the record will still save successfully as long as the other required fields (name, DOB, participant type, ethnicity, special needs) are filled.

### URL Patterns Reference

| Action | URL Pattern |
|--------|-------------|
| New Participant Profile | `/document/edit/id/new/form_id/99/` |
| New Family Profile linked to a participant | `/document/edit/id/new/form_id/98/parent_id/0/link_field_id/1954/link_id/[PARTICIPANT_ID]` |
| New Participant Profile created from a Family Profile | `/document/edit/id/new/form_id/99/parent_id/0/link_field_id/1953/link_id/[FAMILY_PROFILE_ID]` |
| Existing participant record | `/document/edit/id/[RECORD_ID]` |

---

## Part 4: Test User Profiles Created (NAVA Thomas Set)

The following profiles were created as test data for the Nava program in the Sandbox environment. Record IDs are A360-assigned.

### Standalone Participants (no children in A360)

| Record ID | Name | DOB | Type | Ethnicity | Language | Gender | Special Needs | City | Notes |
|-----------|------|-----|------|-----------|----------|--------|---------------|------|-------|
| 339748 | Linh NAVA Thomas XXII | 1995-03-15 | Parent | Asian | English | Female | No | PERRIS, CA 92570 | Has linked child (339750). Married. |
| 339751 | Marcus NAVA Thomas XXIII | 1970-06-20 | Other | White | English | Male | Yes | MORENO VALLEY, CA 92553 | Wheelchair. Married. Tests White ethnicity / BenefitsCal race handling. |
| 339752 | Isabel NAVA Thomas XXIV | 1992-09-10 | Parent | Hispanic/Latino | Spanish | Female | Yes | RIVERSIDE, CA 92501 | Hearing impairment. Married. Has 2 linked children (339754, 339755). |

### Child Participants

| Record ID | Name | DOB | Type | Parent | WIC Eligible | Notes |
|-----------|------|-----|------|--------|--------------|-------|
| 339750 | Baby NAVA Thomas XXII | 2022-06-01 | Child | Linh (339748) | Yes (age ~3) | Linked via Family Profile 339749 |
| 339754 | Marisol NAVA Thomas XXIV | 2022-03-01 | Child | Isabel (339752) | Yes (age ~3) | Linked via Family Profile 339753 |
| 339755 | Rodrigo NAVA Thomas XXIV | 2018-05-01 | Child | Isabel (339752) | No (age ~7, over 5) | Linked via Family Profile 339753. Tests agent correctly excludes over-5 children from WIC. |

### Family Profiles

| Family Profile ID | Primary Member | Members |
|-------------------|----------------|---------|
| 339749 | Linh NAVA Thomas XXII | Linh (Mother), Baby (Daughter) |
| 339753 | Isabel NAVA Thomas XXIV | Isabel (Mother), Marisol (Daughter), Rodrigo (Son) |

### Standard Test Address

All NAVA Thomas test profiles use `638 Test Blvd` as the street address, with city and zip varying by intended test scenario (see the Test Data spreadsheet for full address details per profile).

---

## Part 5: Updating the Test Data Spreadsheet

After creating profiles in A360, update the `Test Data for A360 (updated).xlsx` spreadsheet with the A360-assigned Record IDs. The spreadsheet uses provisional IDs during planning that differ from the system-assigned ones.

Key fields to update:
- **Column A (Record ID)**: Replace provisional ID with actual A360 Record ID
- **Column V (field_3530 / notes)**: Update any cross-references to other Record IDs (e.g., "Child of 339638" → "Child of 339748")
