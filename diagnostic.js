const fs = require('fs');
const path = require('path');

console.log('🔍 Running Nexus OR Planner Diagnostics...\n');

// Check for common issues
const checks = [
  {
    name: 'Node.js Version',
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return {
        pass: major >= 18,
        message: `Node.js ${version} ${major >= 18 ? '✅' : '❌ (requires >= 18)'}`
      };
    }
  },
  {
    name: 'Dependencies',
    check: () => {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = Object.keys(packageJson.dependencies || {}).length;
        const devDeps = Object.keys(packageJson.devDependencies || {}).length;
        return {
          pass: deps > 0,
          message: `${deps} dependencies, ${devDeps} dev dependencies ✅`
        };
      } catch (error) {
        return {
          pass: false,
          message: `❌ Cannot read package.json: ${error.message}`
        };
      }
    }
  },
  {
    name: 'Critical Files',
    check: () => {
      const criticalFiles = [
        'src/app/page.tsx',
        'src/hooks/useORData.ts',
        'src/components/or-planner/CSVImportPanel.tsx',
        'src/lib/or-planner-types.ts'
      ];
      
      const missing = criticalFiles.filter(file => !fs.existsSync(file));
      
      return {
        pass: missing.length === 0,
        message: missing.length === 0 
          ? `All critical files present ✅` 
          : `❌ Missing files: ${missing.join(', ')}`
      };
    }
  },
  {
    name: 'Environment Variables',
    check: () => {
      const requiredEnvVars = ['GOOGLE_API_KEY'];
      const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
      
      return {
        pass: missing.length === 0,
        message: missing.length === 0 
          ? `All required env vars present ✅` 
          : `❌ Missing env vars: ${missing.join(', ')}`
      };
    }
  }
];

// Run all checks
checks.forEach(({ name, check }) => {
  try {
    const result = check();
    console.log(`${name}: ${result.message}`);
  } catch (error) {
    console.log(`${name}: ❌ Error during check: ${error.message}`);
  }
});

console.log('\n🏥 If you\'re still experiencing issues:');
console.log('1. Run: npm install');
console.log('2. Run: npm run typecheck');
console.log('3. Check browser console for client-side errors');
console.log('4. Check terminal for server-side errors');
console.log('5. Verify your CSV file format matches expected schema');

// Check for common CSV issues
if (fs.existsSync('OPPlan 10.07.2025 09.47 Uhr.csv')) {
  console.log('\n📄 CSV File Analysis:');
  try {
    const csvContent = fs.readFileSync('OPPlan 10.07.2025 09.47 Uhr.csv', 'utf8');
    const lines = csvContent.split('\n');
    console.log(`- ${lines.length} lines in CSV`);
    console.log(`- First line: ${lines[0] ? lines[0].substring(0, 100) + '...' : 'Empty'}`);
    
    if (lines[0] && lines[0].includes(';')) {
      console.log('- Uses semicolon delimiter ✅');
    } else {
      console.log('- ❌ May not use semicolon delimiter');
    }
  } catch (error) {
    console.log(`- ❌ Cannot read CSV: ${error.message}`);
  }
}
