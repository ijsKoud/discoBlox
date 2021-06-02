import { app, Menu, Tray, Notification, autoUpdater, App } from "electron";
import { join, resolve, basename } from "path";
import { spawn as cpSpawn } from "child_process";
import { version } from "./package.json";
import Presence from "./src/Presence";
import open from "open";

const destroy = async (tray: Tray, presence: Presence) => {
	await presence.logger.info(false, "Quitting discoBlox... This may take a few seconds.");
	await presence.client.destroy();

	tray.destroy();
	app.quit();
};

const updater = (presence: Presence, tray: Tray) => {
	autoUpdater.on("error", (e) =>
		presence.logger.error(true, `Auto Updater error: ${e.stack || e.message}`)
	);

	autoUpdater.on("checking-for-update", () =>
		presence.logger.info(true, "Autoupdater - Checking for updates...")
	);

	autoUpdater.on("update-available", () => {
		presence.logger.info(true, "Autoupdater - New update available.");
		new Notification({
			title: "roPresence Update Available",
			body: "A new roPresence update is available. Starting the download.",
		}).show();
	});

	autoUpdater.on("update-not-available", () =>
		presence.logger.info(true, "Autoupdater - No update available.")
	);

	autoUpdater.on("update-downloaded", (e, rn, name) => {
		new Notification({
			title: "ℹ discoBlox update downloaded",
			body: `Version ${name} of discoBlox has been downloaded, we will restart the Presence in 5 seconds.`,
		}).show();

		setTimeout(() => autoUpdater.quitAndInstall(), 5e3);
	});

	autoUpdater.setFeedURL({
		url: `https://discoblox.daangamesdg.tk/update/${process.platform}/${version}`,
	});
	autoUpdater.checkForUpdates();

	setInterval(() => autoUpdater.checkForUpdates(), 10 * 60 * 1000);
};

const handleSquirrelEvent = (app: App): boolean => {
	if (process.argv.length === 1) return false;

	const appFolder = resolve(process.execPath, "..");
	const rootAtomFolder = resolve(appFolder, "..");
	const updateDotExe = resolve(join(rootAtomFolder, "Update.exe"));
	const exeName = basename(process.execPath);

	const spawn = function (command: string, args: string[]) {
		try {
			return cpSpawn(command, args, {
				detached: true,
			});
		} catch (e) {
			return null;
		}
	};

	const spawnUpdate = function (args: string[]) {
		return spawn(updateDotExe, args);
	};

	const squirrelEvent = process.argv[1];
	switch (squirrelEvent) {
		case "--squirrel-install":
		case "--squirrel-updated":
			spawnUpdate(["--createShortcut", exeName]);
			setTimeout(app.quit, 1000);

			return true;

		case "--squirrel-uninstall":
			spawnUpdate(["--removeShortcut", exeName]);
			setTimeout(app.quit, 1000);

			return true;

		case "--squirrel-obsolete":
			app.quit();

			return true;
		default:
			return false;
	}
};

const startApp = async () => {
	if (handleSquirrelEvent(app)) return process.exit();
	if (require("electron-squirrel-startup")) return process.exit();

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
	updater(presence, tray);
};

app.on("ready", () => startApp());
