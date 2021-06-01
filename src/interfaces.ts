export interface Response {
	errors?: Error[];
	userPresences?: UserPresence[];
}

export interface Error {
	code: number;
	message: string;
	userFacingMessage: string;
}

export interface UserPresence {
	userPresenceType: number;
	lastLocation: string;
	placeId: number;
	rootPlaceId: number;
	gameId: string;
	universeId: number;
	userId: number;
	lastOnline: Date;
}
