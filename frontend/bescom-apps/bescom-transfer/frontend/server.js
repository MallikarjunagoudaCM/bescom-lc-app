const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

// Serve React build
app.use(express.static(path.join(__dirname, 'build')));

// All routes → index.html (React Router handles client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));
