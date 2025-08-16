// Test script for stock corrections variance API
// This demonstrates the correct way to call the variance-with-totals endpoint

const testVarianceAPI = async () => {
  const productId = '2304';
  const date = '2025-07-22';
  
  // CORRECT way - using start_date and end_date parameters
  const correctUrl = `http://localhost:3001/api/stock-corrections/variance-with-totals/${productId}?start_date=${date}&end_date=${date}`;
  
  // INCORRECT way - using single date parameter (this will fail)
  const incorrectUrl = `http://localhost:3001/api/stock-corrections/variance-with-totals/${productId}?date=${date}`;
  
  console.log('Testing stock corrections variance API...');
  console.log('\n✅ CORRECT URL:');
  console.log(correctUrl);
  console.log('\n❌ INCORRECT URL (will fail):');
  console.log(incorrectUrl);
  
  try {
    const response = await fetch(correctUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your auth token here if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ SUCCESS:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ ERROR:');
      console.log(`Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('\n❌ NETWORK ERROR:');
    console.log(error.message);
  }
};

// Run the test
testVarianceAPI();
