// Credits to JiveOff's roPresence repo for this part of the code (I took it from his repo)
import Axios, { AxiosRequestConfig } from "axios";

// No typings available for rage-edit :(
// @ts-ignore
import { Registry } from "rage-edit";
import Logger from "./Logger";

const RobloxReg = new Registry("HKCU\\Software\\Roblox\\RobloxStudioBrowser\\roblox.com");

export default class Auth {
	constructor(public logger: Logger) {}

	public async getCookie(): Promise<string | null> {
		const entry = await RobloxReg.get(".ROBLOSECURITY");
		const data: any = {};

		entry.split(",").map((dataset: any) => {
			const pairs = dataset.split("::");
			data[pairs[0].toLowerCase()] = pairs[1].substr(1, pairs[1].length - 2);
		});

		if (!data.cook && !data.exp) {
			this.logger.error(false, "No ROBLOX login cookie found.");
			return null;
		} else if (new Date(data.exp).getTime() - Date.now() <= 0) {
			this.logger.error(false, "Invalid ROBLOX login cookie found. (Cookie Expired)");
			return null;
		}

		return data.cook;
	}

	public async get(options: AxiosRequestConfig) {
		const cookie = await this.getCookie();

		options = typeof options === "object" ? options : {};
		options = Object.assign({ method: "get" }, options);

		if (typeof options.headers !== "object") options.headers = {};
		options.headers.Cookie = `.ROBLOSECURITY=${cookie}`;

		return Axios(options);
	}

	public async post(options: AxiosRequestConfig) {
		const cookie = await this.getCookie();

		options = typeof options === "object" ? options : {};
		options = Object.assign({ method: "post" }, options);

		if (typeof options.headers !== "object") options.headers = {};
		options.headers.Cookie = `.ROBLOSECURITY=${cookie}`;

		return Axios(options);
	}

	public getUser() {
		return this.get({
			url: "https://www.roblox.com/mobileapi/userinfo",
		});
	}
}
