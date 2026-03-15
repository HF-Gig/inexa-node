import fetch from "node-fetch"
import dotenv from "dotenv"
dotenv.config()
import fs from "fs"
const client_id = process.env.EDX_API_CLIENT_ID
const client_secret = process.env.EDX_API_CLIENT_SECRET

async function getEdxToken() {
    const response = await fetch('https://api.edx.org/oauth2/v1/access_token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}&token_type=jwt`,
    });

    const data = await response.json();
    return data.access_token;
}

export async function main() {
    const token = await getEdxToken();
    const data = {
        authToken: token,

    };
    const jsonData = JSON.stringify(data, null, 2);
    const filePath = 'data.json';
    fs.writeFile(filePath, jsonData, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('Successfully wrote to file:', filePath);
        }
    });
}

export { getEdxToken };

