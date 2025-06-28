import json
import re
import os
import sys
from collections import defaultdict
from datetime import datetime

try:
    import pdfplumber
    PDF_LIBRARY = 'pdfplumber'
except ImportError:
    try:
        import PyPDF2
        PDF_LIBRARY = 'PyPDF2'
    except ImportError:
        print("Error: Diperlukan library pdfplumber atau PyPDF2")
        print("Install dengan: pip install pdfplumber atau pip install PyPDF2")
        sys.exit(1)

def extract_text_from_pdf(pdf_path):
    """
    Extract text from PDF using available library
    """
    text = ""
    
    if PDF_LIBRARY == 'pdfplumber':
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    
    elif PDF_LIBRARY == 'PyPDF2':
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    
    return text

def clean_and_parse_text(text):
    """
    Clean extracted text and parse Toyota price data
    """
    lines = text.split('\n')
    parsed_data = []
    
    # Pattern to match Toyota price lines
    # Format: MODEL_SERIES MODEL_NAME PRICE
    price_pattern = r'(\d{1,3}(?:,\d{3})*(?:,\d{3}))'
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip header lines and non-data lines
        if any(skip_word in line.upper() for skip_word in [
            'TOYOTA', 'ASTRA', 'MOTOR', 'DISTRIBUTOR', 'SUGGESTED', 
            'RETAIL', 'PRICE', 'DSRP', 'JUNE', 'HARGA', 'TERTERA',
            'DEALER', 'MODEL', 'SERIES', 'NAME', 'DKI'
        ]):
            continue
        
        # Find price in the line (sequence of digits with commas)
        price_matches = re.findall(price_pattern, line)
        if not price_matches:
            continue
            
        # Get the last price match (should be the actual price)
        price_str = price_matches[-1]
        
        # Remove price from line to get model info
        line_without_price = line.replace(price_str, '').strip()
        
        # Split by multiple spaces to separate model series and model name
        parts = re.split(r'\s{2,}', line_without_price)
        
        if len(parts) >= 2:
            model_series = parts[0].strip()
            model_name = ' '.join(parts[1:]).strip()
        else:
            # Fallback: split by single space and take first as series
            parts = line_without_price.split()
            if len(parts) >= 2:
                model_series = parts[0]
                model_name = ' '.join(parts[1:])
            else:
                continue
        
        # Clean model series and name
        if model_series and model_name and price_str:
            try:
                price = int(price_str.replace(',', ''))
                parsed_data.append({
                    'series': model_series,
                    'name': model_name,
                    'price': price
                })
            except ValueError:
                continue
    
    return parsed_data

def group_by_series(parsed_data):
    """
    Group parsed data by model series
    """
    grouped_data = defaultdict(list)
    
    for item in parsed_data:
        model_entry = {
            "model_name": item['name'],
            "price": item['price'],
            "price_formatted": f"Rp {item['price']:,}",
            "image_url": ""  # Placeholder for future image URLs
        }
        grouped_data[item['series']].append(model_entry)
    
    # Convert to regular dict and sort
    result = {}
    for series in sorted(grouped_data.keys()):
        result[series] = {
            "series_name": series,
            "models": sorted(grouped_data[series], key=lambda x: x['price'])
        }
    
    return result

def detect_pdf_info(pdf_path, text):
    """
    Try to detect PDF information like date, region, etc.
    """
    info = {
        "source_file": os.path.basename(pdf_path),
        "extracted_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Try to detect date
    date_patterns = [
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
        r'(\d{1,2})/(\d{1,2})/(\d{4})',
        r'(\d{4})'
    ]
    
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            info["document_date"] = str(matches[0])
            break
    
    # Try to detect region
    regions = ['DKI', 'JAKARTA', 'JABODETABEK', 'INDONESIA']
    for region in regions:
        if region in text.upper():
            info["region"] = region
            break
    
    return info

def main():
    """
    Main function to process PDF and generate JSON
    """
    # Get PDF file path from command line argument or user input
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = input("Masukkan path file PDF: ").strip()
        # Remove quotes if present
        pdf_path = pdf_path.strip('"\'')
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"Error: File {pdf_path} tidak ditemukan!")
        return
    
    if not pdf_path.lower().endswith('.pdf'):
        print("Error: File harus berformat PDF!")
        return
    
    print(f"Menggunakan library: {PDF_LIBRARY}")
    print(f"Memproses file: {pdf_path}")
    
    try:
        # Extract text from PDF
        print("Mengekstrak teks dari PDF...")
        text = extract_text_from_pdf(pdf_path)
        
        if not text.strip():
            print("Error: Tidak dapat mengekstrak teks dari PDF!")
            return
        
        # Parse the extracted text
        print("Parsing data harga...")
        parsed_data = clean_and_parse_text(text)
        
        if not parsed_data:
            print("Error: Tidak ditemukan data harga yang valid!")
            print("Pastikan PDF berisi data harga Toyota dengan format yang benar.")
            return
        
        # Group by series
        print("Mengelompokkan data berdasarkan series...")
        grouped_data = group_by_series(parsed_data)
        
        # Detect PDF info
        pdf_info = detect_pdf_info(pdf_path, text)
        
        # Create final structure
        final_data = {
            "title": "Toyota Indonesia Price List",
            "source_info": pdf_info,
            "note": "Harga yang tertera adalah harga dasar kendaraan, untuk harga akhir dapat mengacu kepada harga yang ada di masing-masing dealer",
            "currency": "IDR",
            "total_series": len(grouped_data),
            "total_models": sum(len(series['models']) for series in grouped_data.values()),
            "model_series": grouped_data
        }
        
        # Generate output filename
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        output_filename = f"toyota_prices_{base_name}.json"
        
        # Save to JSON file
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ Data berhasil disimpan ke: {output_filename}")
        print(f"📊 Total model series: {final_data['total_series']}")
        print(f"🚗 Total model variants: {final_data['total_models']}")
        
        # Show sample data
        if grouped_data:
            print(f"\n📋 Contoh data yang dihasilkan:")
            first_series = list(grouped_data.keys())[0]
            print(f"Series: {first_series}")
            for i, model in enumerate(grouped_data[first_series]['models'][:3]):
                print(f"  {i+1}. {model['model_name']}: {model['price_formatted']}")
            
            if len(grouped_data[first_series]['models']) > 3:
                print(f"  ... dan {len(grouped_data[first_series]['models'])-3} model lainnya")
        
        print(f"\n💡 Tip: Anda bisa menambahkan URL gambar pada field 'image_url' di file JSON")
        
    except Exception as e:
        print(f"Error saat memproses PDF: {str(e)}")
        print("Pastikan PDF tidak terproteksi dan dapat dibaca.")

if __name__ == "__main__":
    main()