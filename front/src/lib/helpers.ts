function getLoraFileUrlFromCookies() {
  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === "diffusers_lora_file_url") {
      return decodeURIComponent(value)
    }
  }
  return null
}

// Helper function to get fine-tune response from localStorage
function getFineTuneResponseFromStorage() {
  try {
    const stored = localStorage.getItem("finetune_response")
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error("Error parsing stored fine-tune response:", error)
    return null
  }
}

// Helper function to clear stored fine-tune data
function clearFineTuneData() {
  // Remove from localStorage
  localStorage.removeItem("finetune_response")

  // Remove cookie by setting expiration to past date
  document.cookie =
    "diffusers_lora_file_url=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
}

export {
  getLoraFileUrlFromCookies,
  clearFineTuneData,
  getFineTuneResponseFromStorage,
}