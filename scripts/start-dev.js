// Start development environment: Hardhat node + Auto-deploy
const { spawn, execSync } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

console.log('Starting VeriChain Development Environment...\n');

// Start hardhat node
const nodeProcess = spawn('npx', ['hardhat', 'node'], {
  cwd: projectDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

let deployed = false;

nodeProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
  
  // When we see the server started message, deploy the contract
  if (!deployed && data.toString().includes('Started HTTP and WebSocket JSON-RPC server')) {
    deployed = true;
    console.log('\n\n🚀 Node is ready! Deploying contract...\n');
    
    // Wait a moment for the server to be fully ready
    setTimeout(() => {
      try {
        const result = execSync('npx hardhat run scripts/deploy.js --network localhost', {
          cwd: projectDir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe']
        });
        console.log(result);
        console.log('\n✅ Development environment ready!');
        console.log('   - Hardhat Node: http://127.0.0.1:8545');
        console.log('   - Contract deployed to: 0x5fbdb2315678afecb367f032d93f642f64180aa3');
        console.log('\nPress Ctrl+C to stop the node.\n');
      } catch (err) {
        console.error('Deployment error:', err.stderr || err.message);
      }
    }, 2000);
  }
});

nodeProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

nodeProcess.on('close', (code) => {
  console.log(`\nHardhat node exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  nodeProcess.kill();
  process.exit(0);
});
