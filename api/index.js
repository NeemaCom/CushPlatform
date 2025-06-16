// Vercel serverless function entry point
const express = require('express');
const { createServer } = require('../dist/index.js');

let app;

module.exports = async (req, res) => {
  if (!app) {
    app = await createServer();
  }
  
  return app(req, res);
};