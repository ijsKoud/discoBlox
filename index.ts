import { app, Menu, Tray } from "electron";
import { version } from "./package.json";
import Presence from "./src/Presence";
import { join } from "path";
import open from "open";

const destroy = async (tray: Tray, presence: Presence) => {
	await presence.logger.info(false, "Quitting discoBlox... This may take a few seconds.");
	await presence.client.destroy();

	tray.destroy();
	app.quit();
};

const startApp = async () => {
	const presence = new Presence();
	const tray = new Tray(join(__dirname, "assets", "logo.png"));

	if (process.platform === "win32") app.setAppUserModelId(`discoBlox - v${version}`);

	tray.setToolTip("discoBlox is loading...");
	tray.setContextMenu(
		Menu.buildFromTemplate([
			{
				label: `discoBlox - v${version}`,
				type: "normal",
			},
			{
				label: "item1",
				type: "separator",
			},
			{
				label: "Exit",
				type: "normal",
				click: () => destroy(tray, presence),
			},
		])
	);

	presence.whenReady = () => {
		tray.setToolTip(`bloxLink - v${version}`);
		tray.setContextMenu(
			Menu.buildFromTemplate([
				{
					label: `discoBlox - v${version}`,
					type: "normal",
				},
				{
					label: "item1",
					type: "separator",
				},
				{
					label: `Roblox: ${presence.robloxUsername}`,
					type: "normal",
				},
				{
					label: `Discord: ${presence.client.user.username}#${presence.client.user.discriminator}`,
					type: "normal",
				},
				{
					label: "item1",
					type: "separator",
				},
				{
					label: "Open Logs",
					type: "normal",
					click: () => open(presence.logger.path),
				},
				{
					label: "Exit",
					type: "normal",
					click: () => destroy(tray, presence),
				},
			])
		);
	};

	presence.start();
};

app.on("ready", () => startApp());
