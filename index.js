const express = require('express');
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/applicant", require("./routes/applicant"));
//app.use("/application", require("./routes/application"));
app.use("/recruiter", require("./routes/recruiter"));
app.use("/user", require("./routes/user"));
app.get("/welcome", (req, res) => {
  res.status(200).send("Welcome 🙌 ");
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
