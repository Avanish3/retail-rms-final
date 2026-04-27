"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../config/data-source");
async function initDatabase() {
    await data_source_1.AppDataSource.initialize();
    const tables = data_source_1.AppDataSource.entityMetadatas.map((metadata) => metadata.tableName).sort();
    if ((0, data_source_1.getActiveDbType)() === "postgres") {
        const [connectionInfo] = await data_source_1.AppDataSource.query("select current_database() as db_name, current_schema() as schema_name");
        console.log(`Database ready: ${(0, data_source_1.describeDatabaseConnection)()} (connected database: ${connectionInfo.db_name}, schema: ${connectionInfo.schema_name})`);
    }
    else {
        console.log(`Database ready: ${(0, data_source_1.describeDatabaseConnection)()}`);
    }
    console.log(`Tables available: ${tables.join(", ")}`);
    await data_source_1.AppDataSource.destroy();
}
initDatabase().catch(async (error) => {
    console.error("Failed to initialize database", error);
    if (data_source_1.AppDataSource.isInitialized) {
        await data_source_1.AppDataSource.destroy();
    }
    process.exit(1);
});
