window.addEventListener('message', (event) => {
  const { key, value } = event.data;
  console.log(`Received update: ${key} = ${value}`);

  // Add your logic to update the scene here
});
