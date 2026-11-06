declare global {
	namespace App {
		interface Locals {
			user: { id: string; email: string; displayName: string } | null;
			isAdmin: boolean;
			sessionToken: string | null;
		}
	}
}

export {};
