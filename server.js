const app = require("./app");
const { connectToDatabase } = require("./database/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectToDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error(
            "Failed to start server:",
            error.message
        );

        process.exit(1);
    }
}
startServer();
