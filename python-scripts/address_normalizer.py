
import os
import sys
import logging
import json
import time

from google import genai
from dotenv import load_dotenv

# Configure logging to stdout (stderr is treated as error by Electron)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def _clean_markdown_response(response_text: str) -> str:
    """
    Cleans markdown formatting from the API response.
    Handles cases where the model returns code blocks despite instructions.
    """
    response_text = response_text.strip()
    
    if response_text.startswith("```"):
        lines = response_text.split('\n')
        # Remove first line if it starts with ```
        if lines[0].startswith("```"):
            lines = lines[1:]
        # Remove last line if it's just ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response_text = '\n'.join(lines).strip()
    
    return response_text


def normalize_addresses(
    addresses: list[str], 
    country: str = "Colombia"
) -> list[str]:
    """
    Normalizes a list of addresses using the Gemini API.
    Optimized to process all addresses in a single API call.
    
    Args:
        addresses: List of addresses to normalize
        country: Country context for address normalization (default: Colombia)
    
    Returns:
        List of normalized addresses in the same order as input
    """
    if not addresses:
        logger.warning("Empty address list provided")
        return addresses
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables. Returning original addresses.")
        return addresses

    try:
        logger.info(f"Starting normalization of {len(addresses)} addresses in a single request")
        
        # Initialize the google.genai client
        client = genai.Client(api_key=api_key)

        prompt = f"""Eres un experto en normalizar direcciones de {country}.

Normaliza la siguiente lista de direcciones. Tu tarea es LIMPIAR y ESTANDARIZAR las direcciones, NO cambiar su estructura.

EJEMPLOS DE NORMALIZACIÓN:
- "Cra 72a 24-72, .," → "Carrera 72a 24 72"
- "cll 45 # 23-15" → "Calle 45 23 15"
- "Kr 15 No. 88-64" → "Carrera 15 88 64"
- "Av. Boyacá 23-45" → "Avenida Boyacá 23 45"
- "Dg 53 sur 24a-10" → "Diagonal 53 Sur 24a 10"
- "Tv 78k bis 45-12" → "Transversal 78k Bis 45 12"
- "Carrera Carrara #72 c-22a 24 Int 3" → "Carrera 72c 22a 24 Int 3"
- "Calle Calle 25G 74B 50 Torre 4" → "Calle 25G 74B 50 Torre 4"

REGLAS:
1. Expande abreviaturas: Cra/Kr → Carrera, Cll → Calle, Av → Avenida, Dg → Diagonal, Tv → Transversal
2. Elimina palabras DUPLICADAS del tipo de vía (Carrera Carrara → Carrera, Calle Calle → Calle, Carrera Carrera → Carrera)
3. Elimina caracteres especiales: guiones (-), numerales (#), "No.", comas, puntos sueltos
4. Mantén las letras que son parte de la numeración (72a, 24b, 78k, etc.)
5. Mantén palabras como "Sur", "Norte", "Bis", "Int", "apt", "apto", "Torre" si están presentes
6. Usa un solo espacio entre cada elemento
7. NO inventes ni agregues información que no esté en la dirección original
8. Devuelve ÚNICAMENTE un array JSON de strings
9. Mantén exactamente el mismo orden de entrada
10. NO incluyas formato markdown ni explicaciones
11. DEBES devolver exactamente {len(addresses)} direcciones

Direcciones de entrada:
{json.dumps(addresses, ensure_ascii=False)}"""

        try:
            logger.info("Sending single request to Gemini API...")
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            response_text = _clean_markdown_response(response.text)
            
            normalized = json.loads(response_text)
            
            if isinstance(normalized, list):
                if len(normalized) == len(addresses):
                    logger.info(f"Successfully normalized {len(normalized)} addresses in single request")
                    return normalized
                
                # Check if we got at least 95% of addresses
                missing_count = len(addresses) - len(normalized)
                missing_percent = (missing_count / len(addresses)) * 100
                
                if missing_percent <= 5:
                    # Pad with original addresses for the missing ones
                    logger.warning(
                        f"Response returned {len(normalized)}/{len(addresses)} addresses "
                        f"(missing {missing_count}, {missing_percent:.1f}%). Padding with originals."
                    )
                    # Pad the result with original addresses
                    for i in range(len(normalized), len(addresses)):
                        normalized.append(addresses[i])
                    return normalized
                else:
                    logger.warning(
                        f"Response missing too many addresses ({missing_percent:.1f}%). "
                        "Falling back to batch processing."
                    )
                    return _normalize_in_batches(client, addresses, country)
            else:
                logger.warning("Response is not a list. Falling back to batch processing.")
                return _normalize_in_batches(client, addresses, country)
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in single request: {e}")
            logger.debug(f"Raw response: {response_text}")
            logger.info("Falling back to batch processing...")
            return _normalize_in_batches(client, addresses, country)
        except Exception as e:
            logger.error(f"Error in single request: {e}")
            logger.info("Falling back to batch processing...")
            return _normalize_in_batches(client, addresses, country)

    except Exception as e:
        logger.critical(f"Critical error in address normalization: {e}")
        return addresses


def _normalize_in_batches(
    client,
    addresses: list[str],
    country: str,
    batch_size: int = 50
) -> list[str]:
    """
    Fallback function to normalize addresses in batches if single request fails.
    """
    logger.info(f"Processing {len(addresses)} addresses in batches of {batch_size}")
    
    normalized_addresses = []
    total_batches = (len(addresses) + batch_size - 1) // batch_size
    
    for i in range(0, len(addresses), batch_size):
        batch = addresses[i:i+batch_size]
        batch_num = i // batch_size + 1
        
        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} addresses)")
        
        prompt = f"""Eres un experto en normalizar direcciones de {country}.

Normaliza la siguiente lista de direcciones. Tu tarea es LIMPIAR y ESTANDARIZAR las direcciones, NO cambiar su estructura.

EJEMPLOS DE NORMALIZACIÓN:
- "Cra 72a 24-72, .," → "Carrera 72a 24 72"
- "cll 45 # 23-15" → "Calle 45 23 15"
- "Kr 15 No. 88-64" → "Carrera 15 88 64"
- "Av. Boyacá 23-45" → "Avenida Boyacá 23 45"
- "Dg 53 sur 24a-10" → "Diagonal 53 Sur 24a 10"
- "Tv 78k bis 45-12" → "Transversal 78k Bis 45 12"
- "Carrera Carrara #72 c-22a 24 Int 3" → "Carrera 72c 22a 24 Int 3"
- "Calle Calle 25G 74B 50 Torre 4" → "Calle 25G 74B 50 Torre 4"

REGLAS:
1. Expande abreviaturas: Cra/Kr → Carrera, Cll → Calle, Av → Avenida, Dg → Diagonal, Tv → Transversal
2. Elimina palabras DUPLICADAS del tipo de vía (Carrera Carrara → Carrera, Calle Calle → Calle, Carrera Carrera → Carrera)
3. Elimina caracteres especiales: guiones (-), numerales (#), "No.", comas, puntos sueltos
4. Mantén las letras que son parte de la numeración (72a, 24b, 78k, etc.)
5. Mantén palabras como "Sur", "Norte", "Bis", "Int", "apt", "apto", "Torre" si están presentes
6. Usa un solo espacio entre cada elemento
7. NO inventes ni agregues información que no esté en la dirección original
8. Devuelve ÚNICAMENTE un array JSON de strings
9. Mantén exactamente el mismo orden de entrada
10. NO incluyas formato markdown ni explicaciones
11. DEBES devolver exactamente {len(batch)} direcciones

Direcciones de entrada:
{json.dumps(batch, ensure_ascii=False)}"""
        
        try:
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt
            )
            response_text = _clean_markdown_response(response.text)
            
            batch_normalized = json.loads(response_text)
            
            if isinstance(batch_normalized, list) and len(batch_normalized) == len(batch):
                normalized_addresses.extend(batch_normalized)
                logger.info(f"Batch {batch_num} processed successfully")
            else:
                logger.warning(f"Batch {batch_num} returned unexpected length. Using original addresses.")
                normalized_addresses.extend(batch)
                
        except Exception as e:
            logger.error(f"Error processing batch {batch_num}: {e}")
            normalized_addresses.extend(batch)

    logger.info(f"Batch processing complete. Processed {len(normalized_addresses)} addresses")
    return normalized_addresses
