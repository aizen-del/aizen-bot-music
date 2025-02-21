

module.exports = {
  TOKEN: "",
  language: "en",
  ownerID: ["1004206704994566164", ""], 
  mongodbUri : "mongodb+srv://aizen:<aizenbot>@musicbot.fyain.mongodb.net/?retryWrites=true&w=majority",
  setupFilePath: './commands/setup.json',
  commandsDir: './commands',  
  embedColor: "#1db954",
  activityName: "YouTube Music", 
  embedTimeout: 5, 
  errorLog: "", 
  nodes: [
     {
      name: "XX",
      password: "enteryourcustompass",
      host: "180.188.226.76",
      port:  7019,
      secure: false
    }
  ]
}
