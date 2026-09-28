import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db.js";
import User from "../src/models/User.js";

function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal to enter the password safely.");
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (character) => {
      if (character === "\u0003") {
        finish(new Error("Admin setup cancelled."));
      } else if (character === "\r" || character === "\n") {
        finish();
      } else if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  await connectDB();

  if (await User.exists({ role: "ADMIN" })) {
    throw new Error("An Admin already exists. Bootstrap can only create the first Admin account.");
  }

  const prompts = readline.createInterface({ input: stdin, output: stdout });
  let name;
  let email;
  try {
    name = (await prompts.question("Admin name: ")).trim();
    email = (await prompts.question("Admin email: ")).trim().toLowerCase();
  } finally {
    prompts.close();
  }

  if (!name || !email || !email.includes("@")) {
    throw new Error("A name and valid email address are required.");
  }

  if (await User.exists({ email })) {
    throw new Error("That email already belongs to an account. Use a different email address.");
  }

  const password = await readHidden("Admin password (minimum 12 characters): ");
  if (password.length < 12) {
    throw new Error("Admin password must be at least 12 characters long.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hashedPassword, role: "ADMIN" });
  stdout.write(`Admin account created for ${email}.\n`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });