import * as fs from "node:fs";
import * as path from "node:path";
import type { Knex } from "knex";
import type {
  PermissionInitializationReport,
  TablePermissions,
} from "../types";
import { PermissionService } from "../permissionService";
import { DBInspector } from "./inspector";

/**
 * Initializes permissions for all tables in the database
 * @param knex Knex instance
 * @param permissionService Permission service instance
 * @param dbInspector Database inspector instance
 * @param excludedTables List of tables to exclude from initialization
 * @param defaultPermissions Default permissions to apply
 * @param reportPath Path where to save the report file
 * @param onComplete Callback function to call when initialization is complete
 */
export async function initializePermissions(
  knex: Knex,
  permissionService: PermissionService,
  dbInspector: DBInspector,
  excludedTables: string[],
  defaultPermissions: TablePermissions,
  reportPath?: string,
  onComplete?: (report: PermissionInitializationReport) => void,
): Promise<void> {
  // Start the initialization process in the background
  setTimeout(async () => {
    const report: PermissionInitializationReport = {
      startTime: new Date(),
      endTime: new Date(),
      totalTables: 0,
      tablesWithPermissions: 0,
      tablesInitialized: 0,
      tablesExcluded: 0,
      initializedTables: [],
      existingPermissionTables: [],
      excludedTables: [],
      errors: [],
    };

    try {
      // Get all tables
      const allTables = await dbInspector.getTables();

      // Filter out excluded tables
      const tablesToProcess = allTables.filter(
        (table) => !excludedTables.includes(table),
      );

      report.totalTables = allTables.length;
      report.tablesExcluded = allTables.length - tablesToProcess.length;
      report.excludedTables = excludedTables;

      // Process each table
      for (const table of tablesToProcess) {
        try {
          // Check if the table already has permissions
          const existingPermissions =
            await permissionService.getPermissionsForTable(table);

          if (
            existingPermissions &&
            Object.keys(existingPermissions).length > 0
          ) {
            // Table already has permissions
            report.tablesWithPermissions++;
            report.existingPermissionTables.push(table);
          } else {
            // Table doesn't have permissions, set default permissions
            await permissionService.setPermissionsForTable(
              table,
              defaultPermissions,
            );
            report.tablesInitialized++;
            report.initializedTables.push(table);
          }
        } catch (error) {
          // Log the error and continue with the next table
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          report.errors.push({ table, error: errorMessage });
          console.error(
            `Error initializing permissions for table ${table}:`,
            error,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      report.errors.push({ table: "global", error: errorMessage });
      console.error("Error during permission initialization:", error);
    } finally {
      // Update the end time
      report.endTime = new Date();

      // Generate the report file if a path is provided
      if (reportPath) {
        generateReportFile(report, reportPath);
      }

      // Call the callback if provided
      if (onComplete) {
        onComplete(report);
      }

      console.log("Permission initialization completed");
    }
  }, 0);
}

/**
 * Generates a report file with the initialization results
 * @param report The initialization report
 * @param reportPath Path where to save the report
 */
function generateReportFile(
  report: PermissionInitializationReport,
  reportPath: string,
): void {
  try {
    // Ensure the directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Format the report as a readable string
    const formattedReport = formatReportAsMarkdown(report);

    // Write the report to the file
    fs.writeFileSync(reportPath, formattedReport);

    console.log(`Permission initialization report saved to ${reportPath}`);
  } catch (error) {
    console.error("Error generating report file:", error);
  }
}

/**
 * Formats the report as a markdown string
 * @param report The initialization report
 * @returns Formatted report as markdown
 */
function formatReportAsMarkdown(
  report: PermissionInitializationReport,
): string {
  const duration =
    (report.endTime.getTime() - report.startTime.getTime()) / 1000;

  return `# ForgeBase Permission Initialization Report

## Summary
- **Start Time**: ${report.startTime.toISOString()}
- **End Time**: ${report.endTime.toISOString()}
- **Duration**: ${duration.toFixed(2)} seconds
- **Total Tables**: ${report.totalTables}
- **Tables with Existing Permissions**: ${report.tablesWithPermissions}
- **Tables Initialized**: ${report.tablesInitialized}
- **Tables Excluded**: ${report.tablesExcluded}

## Details

### Tables Initialized (${report.initializedTables.length})
${
  report.initializedTables.length > 0
    ? report.initializedTables.map((table) => `- \`${table}\``).join("\n")
    : "- None"
}

### Tables with Existing Permissions (${report.existingPermissionTables.length})
${
  report.existingPermissionTables.length > 0
    ? report.existingPermissionTables
        .map((table) => `- \`${table}\``)
        .join("\n")
    : "- None"
}

### Excluded Tables (${report.excludedTables.length})
${
  report.excludedTables.length > 0
    ? report.excludedTables.map((table) => `- \`${table}\``).join("\n")
    : "- None"
}

### Errors (${report.errors.length})
${
  report.errors.length > 0
    ? report.errors.map((err) => `- \`${err.table}\`: ${err.error}`).join("\n")
    : "- None"
}
`;
}
