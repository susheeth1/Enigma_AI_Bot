import os
import requests
from config.settings import Config

class WebSearchService:
    """Service for handling web search using Serper API"""
    
    def __init__(self):
        self.api_key = Config.SERPER_API_KEY
        self.base_url = "https://google.serper.dev/search"
    
    def search(self, query, num_results=5):
        """Perform web search using Serper API"""
        if not self.api_key:
            return {
                'error': 'Serper API key not configured',
                'results': []
            }
        
        try:
            headers = {
                'X-API-KEY': self.api_key,
                'Content-Type': 'application/json'
            }
            
            payload = {
                'q': query,
                'num': num_results
            }
            
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._format_search_results(data, query)
            else:
                return {
                    'error': f'Search API error: {response.status_code}',
                    'results': []
                }
                
        except Exception as e:
            return {
                'error': f'Search failed: {str(e)}',
                'results': []
            }
    
    def _format_search_results(self, data, query):
        """Format search results for display"""
        results = []
        
        # Process organic results
        if 'organic' in data:
            for item in data['organic'][:5]:
                results.append({
                    'title': item.get('title', ''),
                    'link': item.get('link', ''),
                    'snippet': item.get('snippet', ''),
                    'source': 'organic'
                })
        
        # Process knowledge graph if available
        if 'knowledgeGraph' in data:
            kg = data['knowledgeGraph']
            results.insert(0, {
                'title': kg.get('title', ''),
                'link': kg.get('website', ''),
                'snippet': kg.get('description', ''),
                'source': 'knowledge_graph'
            })
        
        # Process answer box if available
        if 'answerBox' in data:
            ab = data['answerBox']
            results.insert(0, {
                'title': ab.get('title', 'Answer'),
                'link': ab.get('link', ''),
                'snippet': ab.get('answer', ab.get('snippet', '')),
                'source': 'answer_box'
            })
        
        return {
            'query': query,
            'results': results,
            'total_results': len(results)
        }
    
    def format_search_context(self, search_results):
        """Format search results as context for LLM"""
        if not search_results.get('results'):
            return ""
        
        context = f"Web Search Results for '{search_results['query']}':\n\n"
        
        for i, result in enumerate(search_results['results'], 1):
            context += f"{i}. {result['title']}\n"
            context += f"   {result['snippet']}\n"
            context += f"   Source: {result['link']}\n\n"
        
        return context