"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../config/data-source");
const env_1 = require("../config/env");
async function initDatabase() {
    await data_source_1.AppDataSource.initialize();
    const tables = data_source_1.AppDataSource.entityMetadatas.map((metadata) => metadata.tableName).sort();
    if (env_1.env.dbType === "postgres") {
        const [connectionInfo] = await data_source_1.AppDataSource.query("select current_database() as db_name, current_schema() as schema_name");
        console.log(`Database ready: postgres://${env_1.env.dbUser}@${env_1.env.dbHost}:${env_1.env.dbPort}/${connectionInfo.db_name} (schema: ${connectionInfo.schema_name})`);
    }
    else {
        console.log(`Database ready: sqljs file at ${env_1.env.sqlJsLocation}`);
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
