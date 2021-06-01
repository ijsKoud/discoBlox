import { Client, Presence as iPresence } from "discord-rpc";
import { Response, UserPresence } from "./interfaces";
import axios, { AxiosResponse } from "axios";
import { version } from "../package.json";
import { Notification } from "electron";
import Logger from "./Logger";
import Auth from "./Auth";

export default class Presence {
	public robloxId: string | null = null;
	public robloxUsername: string | null = null;

	public logger: Logger = new Logger();
	public auth: Auth = new Auth(this.logger);

	public client: Client = new Client({ transport: "ipc" });
	public clientId: string = "719556346378453054";

	public presence: UserPresence | null = null;
	public startDate: number = Date.now();
	public loggedIn: boolean = false;

	public whenReady: (() => void | Promise<void>) | null = null;

	public constructor() {}

	private async getRobloxId(discordId: string): Promise<void> {
		try {
			let { data } = await axios.get(`https://api.blox.link/v1/user/${discordId}`);
			if (!data || data.status === "error") {
				new Notification({
					title: `ℹ discoBlox - ${version}`,
					body: "No roblox account found. Please connect your Roblox account to your Discord account via Bloxlink",
					silent: true,
				})
					.on("click", () => open("https://blox.link/"))
					.show();

				return this.logger.error(true, "No roblox account found, terminating...");
			}

			this.robloxId = data.primaryAccount;

			const user = await this.auth.getUser();
			this.robloxUsername = user.data.UserName;

			this.logger.info(
				true,
				`Successfully retrieved ROBLOX user info - ${this.robloxUsername} (${this.robloxId})`
			);
		} catch (e) {
			this.logger.error(false, "Something went wrong when looking up your roblox account.");
			this.logger.error(true, `Error: ${e.stack || e.message}`);
		}
	}

	private async getRobloxPresence(): Promise<Response | null> {
		try {
			if (!this.robloxId?.length) return null;
			const { data }: AxiosResponse<Response> = await this.auth.post({
				url: "https://presence.roblox.com/v1/presence/users",
				data: { userIds: [this.robloxId] },
			});

			this.logger.info(
				true,
				`Successfully retrieved ROBLOX presence for ${this.robloxUsername} (${this.robloxId})`
			);
			return data;
		} catch (e) {
			this.logger.error(
				false,
				`Error while getting the ROBLOX Presence data: ${e.stack || e.message}`
			);
			return null;
		}
	}

	public async getGameInfo() {
		// comming soon
	}

	private async createRPC() {
		switch (this.presence?.userPresenceType) {
			case 1:
				return {
					largeImageKey: "roblox",
					smallImageKey: "website",
					largeImageText: `discoBlox v${version}`,
					smallImageText: `User: ${this.robloxUsername}`,
					details: "On the website",
					buttons: [
						{
							label: "User Profile",
							url: `https://www.roblox.com/users/${this.robloxId}/profile`,
						},
					],
				} as iPresence;
			case 2:
				const game = await this.getGameInfo();

				return {
					largeImageKey: "roblox",
					smallImageKey: "playing",
					largeImageText: `discoBlox v${version}`,
					smallImageText: `User: ${this.robloxUsername}`,
					details: `Playing a game`,
					state: this.presence.lastLocation,
					buttons: [
						{
							label: "User Profile",
							url: `https://www.roblox.com/users/${this.robloxId}/profile`,
						},
						{
							label: "Game",
							url: `https://www.roblox.com/games/refer?PlaceId=${this.presence.rootPlaceId}`,
						},
					],
				} as iPresence;
			case 3:
				return {
					largeImageKey: "roblox",
					smallImageKey: "studio",
					largeImageText: `discoBlox v${version}`,
					smallImageText: `User: ${this.robloxUsername}`,
					details: "Working in Studios",
					state: this.presence.lastLocation,
					buttons: [
						{
							label: "User Profile",
							url: `https://www.roblox.com/users/${this.robloxId}/profile`,
						},
					],
				} as iPresence;
			default:
				return {
					largeImageKey: "roblox",
					smallImageKey: "offline",
					largeImageText: `discoBlox v${version}`,
					smallImageText: `User: ${this.robloxUsername}`,
					state: "User is offline",
					buttons: [
						{
							label: "User Profile",
							url: `https://www.roblox.com/users/${this.robloxId}/profile`,
						},
					],
				} as iPresence;
		}
	}

	private async updatePresence() {
		try {
			const res = await this.getRobloxPresence();
			if (!res) return this.logger.info(true, "No ROBLOX presence data received.");
			if (res.errors) throw new Error(res.errors[0].message);

			if (
				this.presence &&
				this.presence.userPresenceType === res.userPresences![0].userPresenceType &&
				this.presence.placeId === res.userPresences![0].placeId
			)
				return this.logger.info(true, "ROBLOX Presence same as old one, skipping the update.");

			this.presence = res.userPresences![0];
			this.startDate = Date.now();

			const rpcData = await this.createRPC();
			await this.client.setActivity({ ...rpcData, startTimestamp: this.startDate });

			this.logger.info(
				true,
				`ROBLOX Presence changed to ${this.presence.userPresenceType}, Discord presence has been updated.`
			);
		} catch (e) {
			this.logger.error(
				false,
				`Error while updating your Discord presence: ${e.stack || e.message}`
			);
		}
	}

	public async start() {
		try {
			this.logger.info(true, "Attempting to connect to Discord via IPC.");
			this.client.login({ clientId: this.clientId }).catch((e) => {
				throw new Error(e);
			});

			this.client.on("ready", async () => {
				this.logger.info(
					true,
					`Successfully connected to Discord via IPC - user ${this.client.user.username}#${this.client.user.discriminator} (${this.client.user.id})`
				);

				await this.getRobloxId(this.client.user.id);
				if (this.whenReady && typeof this.whenReady === "function") this.whenReady();

				if (!this.robloxId) process.exit();
				await this.updatePresence();
				setInterval(async () => await this.updatePresence(), 15e3);

				this.logger.info(
					false,
					"discoBlox is now active and online. Your status will be updated every 15 seconds."
				);
			});
		} catch (e) {
			this.logger.error(true, `Login error: ${e.stack || e.message}`);
			this.logger.error(
				false,
				"We were unable to connect to Discord. We will let you know when we successfully connected to Discord again!"
			);

			setInterval(() => {
				if (!this.loggedIn) this.client.login({ clientId: this.clientId });
			}, 3e4);
		}
	}
}
