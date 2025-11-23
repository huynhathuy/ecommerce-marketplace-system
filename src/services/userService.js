export default async function getCurrentUser() {
    try {
        const reponse = await fetch(`api/users/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!reponse.ok) {
            console.warn('No current user found.');
            return null;
        }
        return await reponse.json();
    } catch (error) {
        console.error('Failed to fetch current user:', error.message);
        throw error;
    }
}