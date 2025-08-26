import os
import requests
import numpy as np
from config.settings import Config

class NomicEmbeddings:
    """Nomic API-based embeddings service"""
    
    def __init__(self):
        self.api_key = Config.NOMIC_API_KEY
        self.base_url = "https://api-atlas.nomic.ai/v1/embedding/text"
        self.model = Config.NOMIC_MODEL_NAME
        
        if not self.api_key:
            raise ValueError("NOMIC_API_KEY is required for embeddings")
        
        print(f"✅ Nomic Embeddings initialized with model: {self.model}")
    
    def embed_query(self, text):
        """Get embedding for a single text query"""
        return self.embed_documents([text])[0]
    
    def embed_documents(self, texts):
        """Get embeddings for multiple documents"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': self.model,
                'texts': texts
            }
            
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                embeddings = data.get('embeddings', [])
                
                # Normalize embeddings
                normalized_embeddings = []
                for embedding in embeddings:
                    norm = np.linalg.norm(embedding)
                    if norm > 0:
                        normalized_embeddings.append((np.array(embedding) / norm).tolist())
                    else:
                        normalized_embeddings.append(embedding)
                
                return normalized_embeddings
            else:
                print(f"Nomic API error: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"Error calling Nomic API: {str(e)}")
            return []
    
    def test_connection(self):
        """Test Nomic API connection"""
        try:
            result = self.embed_query("test")
            return len(result) > 0
        except:
            return False