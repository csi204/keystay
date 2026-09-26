const token = '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';

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'keystay-agent',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function rest(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'keystay-agent',
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`https://api.github.com${path}`, options);
  return res.json();
}

async function main() {
  console.log('1. Querying Project Board...');
  const projQuery = `
    query {
      node(id: "PVT_kwDOEZO6rs4Bkw4X") {
        ... on ProjectV2 {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2FieldCommon {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
          items(first: 30) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                }
              }
              fieldValues(first: 10) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const projData = await graphql(projQuery);
  const project = projData.data.node;
  console.log('Project Title:', project.title);

  const statusField = project.fields.nodes.find(f => f.name === 'Status');
  console.log('Status Field Options:', statusField.options);
  const doneOption = statusField.options.find(o => o.name === 'Done');

  // Find item for Issue #9
  const itemIssue9 = project.items.nodes.find(item => item.content && item.content.number === 9);
  if (itemIssue9 && doneOption) {
    console.log(`Moving Issue #9 (Item ID: ${itemIssue9.id}) to Done...`);
    const updateItemMutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $value }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `;
    const res = await graphql(updateItemMutation, {
      projectId: project.id,
      itemId: itemIssue9.id,
      fieldId: statusField.id,
      value: doneOption.id,
    });
    console.log('Project Item updated to Done:', res);
  }

  // Close Issue #9 on GitHub Issues
  console.log('Closing Issue #9 on GitHub...');
  await rest('/repos/csi204/keystay/issues/9/comments', 'POST', {
    body: '✅ **Service Completed & Deployed to Cloudflare Workers!**\n\n- All 14 APIs (#87-#100) implemented in `apps/services/report-analytics`\n- D1 Database `db_report` schema & mock data seeded\n- Live at `https://keystay-report-analytics.khetsophon-ain.workers.dev`\n- Supported CSV (`/reports/export/csv`) & Minimalist Printable PDF (`/reports/export/pdf`)\n- Supported Partial Section Refresh via `POST /reports/refresh?section=...`',
  });
  await rest('/repos/csi204/keystay/issues/9', 'PATCH', {
    state: 'closed',
  });
  console.log('Issue #9 closed successfully.');

  // Update descriptions or comments on Issue #13 (Phase 4), Issue #2 (room-inventory), Issue #3 (reservation), Issue #11 (housekeeping) to reflect บุญ = QA Lead, เดียร์ = SA Lead
  console.log('Updating team descriptions on GitHub...');
  await rest('/repos/csi204/keystay/issues/13/comments', 'POST', {
    body: '📋 **Team Roles & Ownership Matrix Updated:**\n\n- **เขต (@hazeco)**: Project Lead, Infra, DevOps, CI/CD, Gateway, Manager & Admin Portal\n- **เดียร์ (@allmusgus)**: SA Lead, System Analyst, Schemas, State Machines, Front Desk & Cashier Portal\n- **บุญ (@Legxcy77)**: QA Lead, UAT Scenarios, Postman Automation, QA Quality Gates, Housekeeping Portal',
  });

  console.log('GitHub updates complete!');
}

main().catch(console.error);
