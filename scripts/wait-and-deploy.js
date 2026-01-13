/**
 * Wait for Hardhat node to be ready, then deploy contracts
 */
const { exec } = require('child_process');
const http = require('http');

const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function waitForNode() {
  console.log('⏳ Waiting for Hardhat node to start...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: 8545,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, (res) => {
          resolve(true);
        });
        
        req.on('error', (err) => {
          reject(err);
        });
        
        req.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        }));
        req.end();
      });
      
      if (result) {
        console.log('✅ Hardhat node is ready!');
        return true;
      }
    } catch (err) {
      console.log(`   Attempt ${i + 1}/${MAX_RETRIES} - Node not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  console.log('❌ Failed to connect to Hardhat node');
  return false;
}

async function deploy() {
  const ready = await waitForNode();
  if (!ready) {
    process.exit(1);
  }
  
  console.log('🚀 Deploying contracts...');
  
  return new Promise((resolve, reject) => {
    const deployProcess = exec('npx hardhat run scripts/deploy.js --network localhost', {
      cwd: process.cwd()
    });
    
    deployProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    deployProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    deployProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Deployment complete!');
        resolve();
      } else {
        console.log('❌ Deployment failed');
        reject(new Error(`Deploy exited with code ${code}`));
      }
    });
  });
}

deploy().catch(console.error);
