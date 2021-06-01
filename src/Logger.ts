import { readFile, writeFile, appendFile } from "fs/promises";
import { Logger as cLogger } from "@dimensional-fun/logger";
import { version } from "../package.json";
import { Notification } from "electron";
import { join } from "path";
import moment from "moment";

export default class Logger {
	public path = join(process.cwd(), `logs-${version.replace(/\./g, "")}.txt`);
	public _logger = new cLogger(`discoBlox - ${version}`);

	constructor() {}

	public async checkFile(): Promise<void> {
		try {
			await readFile(this.path);
		} catch (e) {
			writeFile(this.path, `discoBlox Logs - version ${version}`).catch((e) => process.exit());
		}
	}

	public async writeFile(str: string, type: string) {
		try {
			await appendFile(
				this.path,
				`\n${moment(Date.now()).format("hh:mm:ss DD-MM-YYYY")} ${type}  ${process.pid}  (${
					this._logger.name
				}): ${str}`
			);
		} catch (e) {
			new Notification({
				title: `⚠ discoBlox - ${version}`,
				body: "discoBlox is unable to save the logs.",
				silent: true,
			}).show();
		}
	}

	public async info(silent: boolean, ...args: string[]): Promise<void> {
		this._logger.info(args);
		if (!silent)
			new Notification({
				title: `ℹ discoBlox - ${version}`,
				body: args.join("\n"),
				silent: true,
			}).show();

		await this.checkFile();
		await this.writeFile(args.join("\n"), "info");
	}

	public async error(silent: boolean, ...args: string[]): Promise<void> {
		this._logger.error(args);
		if (!silent)
			new Notification({
				title: `⚠ discoBlox - ${version}`,
				body: args.join("\n"),
				silent: true,
			}).show();

		await this.checkFile();
		await this.writeFile(args.join("\n"), "error");
	}

	public async warn(silent: boolean, ...args: string[]): Promise<void> {
		this._logger.error(args);
		if (!silent)
			new Notification({
				title: `❗ discoBlox - ${version}`,
				body: args.join("\n"),
				silent: true,
			}).show();

		await this.checkFile();
		await this.writeFile(args.join("\n"), "warn");
	}
}
