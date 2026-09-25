// Public raw URL for a complete English dictionary JSON dataset
const DICTIONARY_URL = "https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary.json";

// Helper: Compute 17-dimensional vector based on character code modulo arithmetic
function getMod17Vector(word) {
  const vec = new Array(17).fill(0);
  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i);
    vec[code % 17]++;
  }
  return vec;
}

// Helper: Compute cosine similarity between two 17-element vectors
function cosineSimilarity(v1, v2) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 17; i++) {
    dotProduct += v1[i] * v2[i];
    normA += v1[i] ** 2;
    normB += v2[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find closest matching *different* dictionary word via vector cosine similarity
function findAlternativeBestMatch(inputWord, dictVectors) {
  const cleanWord = inputWord.toLowerCase();
  if (!cleanWord.trim()) return inputWord;
  
  const inputVec = getMod17Vector(cleanWord);
  let bestMatch = inputWord;
  let maxSimilarity = -1;

  for (const entry of dictVectors) {
    // Enforce that we target a *new* word by skipping self-matches
    if (entry.word.toLowerCase() === cleanWord) continue;

    const sim = cosineSimilarity(inputVec, entry.vector);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      bestMatch = entry.word;
    }
  }
  
  // Retain original capitalization style roughly
  if (inputWord[0] === inputWord[0].toUpperCase()) {
    return bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
  }
  return bestMatch;
}

// Recursively parse and update DOM text nodes
function transformTextNodes(node, dictVectors) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue;
    if (text.trim().length > 0) {
      node.nodeValue = text.replace(/\b[a-zA-Z]+\b/g, match => findAlternativeBestMatch(match, dictVectors));
    }
  } else {
    const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'TEXTAREA'];
    if (!skipTags.includes(node.nodeName)) {
      for (let child of node.childNodes) {
        transformTextNodes(child, dictVectors);
      }
    }
  }
}

// Main execution flow: Fetch online dictionary, precompute vectors, and enforce new word mapping
async function initExtension() {
  try {
    console.log("Fetching dictionary from the internet...");
    const response = await fetch(DICTIONARY_URL);
    const rawDictionaryObject = await response.json();
    
    // Extract dictionary keys and limit subset for responsive performance
    const dictionaryWords = Object.keys(rawDictionaryObject).slice(0, 5000);

    console.log(`Loaded ${dictionaryWords.length} words. Precomputing mod-17 vectors...`);
    const dictVectors = dictionaryWords.map(word => ({
      word: word,
      vector: getMod17Vector(word)
    }));

    // Apply transformation across the document body
    transformTextNodes(document.body, dictVectors);
    console.log("Mod17 novel-word vector transformation complete.");
  } catch (error) {
    console.error("Failed to process internet dictionary transformation:", error);
  }
}

initExtension();