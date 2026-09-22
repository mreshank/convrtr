// Ambient declarations for sql.js 1.14, which ships no TypeScript types.
// Kept narrow to the API surface this engine uses.

declare module "sql.js" {
	export interface SqlJsStatement {
		step(): boolean;
		get(): Array<string | number | Uint8Array | null>;
		getColumnNames(): string[];
		bind(values: Array<string | number | Uint8Array | null>): void;
		free(): boolean;
	}

	export interface SqlJsDatabase {
		exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
		prepare(sql: string): SqlJsStatement;
		run(sql: string): void;
		export(): Uint8Array;
		close(): void;
	}

	export interface SqlJsStatic {
		Database: new (data?: Uint8Array) => SqlJsDatabase;
	}

	const initSqlJs: (config?: {
		locateFile?: (file: string) => string;
	}) => Promise<SqlJsStatic>;
	export default initSqlJs;
}
