import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsDir = path.resolve(__dirname, '../src');
const artifactsDir = path.resolve(__dirname, '../artifacts');

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

console.log('Compiling contracts in:', contractsDir);

const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));
const sources = {};

for (const file of files) {
  sources[file] = {
    content: fs.readFileSync(path.join(contractsDir, file), 'utf8'),
  };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

let hasErrors = false;
if (output.errors) {
  for (const error of output.errors) {
    if (error.severity === 'error') {
      console.error('❌ Compilation Error:', error.formattedMessage);
      hasErrors = true;
    } else {
      console.warn('⚠️ Warning:', error.formattedMessage);
    }
  }
}

if (hasErrors) {
  console.error('Compilation failed.');
  process.exit(1);
}

for (const file in output.contracts) {
  for (const contract in output.contracts[file]) {
    const artifact = {
      contractName: contract,
      sourceFile: file,
      abi: output.contracts[file][contract].abi,
      bytecode: output.contracts[file][contract].evm.bytecode.object,
    };
    const dest = path.join(artifactsDir, `${contract}.json`);
    fs.writeFileSync(dest, JSON.stringify(artifact, null, 2));
    console.log(`✅ Artifact saved: ${contract} -> artifacts/${contract}.json`);
  }
}

console.log('🎉 All contracts compiled successfully!');
