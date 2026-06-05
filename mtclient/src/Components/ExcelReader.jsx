import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelReader({data, setData, headers, sheet}) {
    const fileRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleFileRead() {
        try {
            setLoading(true);
            setError(null);

            const file = fileRef.current?.files?.[0];
            if (!file) {
                setError('Please select a file');
                return;
            }
            // Validate file type
            const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
            if (!validTypes.includes(file.type)) {
                setError('Please select a valid Excel or CSV file');
                return;
            }
            // Read and parse file
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            if (!workbook.SheetNames.length) {
                setError('Excel file has no sheets');
                return;
            }

            const sheetName = sheet;
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                setError(`Sheet named ${sheet}  is empty`);
                return;
            }
            if(verifyData(jsonData)){
                setData(jsonData);
                setError(null);
            }
        } 
        catch (err) {
            console.error('File read error:', err);
            setError('Failed to read file. Ensure it is a valid Excel/CSV file.');
        } 
        finally {
            setLoading(false);
        }
    }

    const handleReset = () => {
        setData(null);
        setError(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    function verifyData(data) {
    if (!data || data.length === 0) return;
    const validate = () => {
        return data.map((obj, index) => {
            const missing = headers.filter(header => !Object.prototype.hasOwnProperty.call(obj, header));
            return {
                index,
                isValid: missing.length === 0,
                missing
            };
        }).filter(result => !result.isValid);
    };

    const errors = validate();
    
    if (errors.length > 0) {
        console.error("Validation failed for items:", errors);
        setError(`Validation failed: Missing headers in ${errors.length} rows.`);
        return false; // Return false so you know NOT to proceed
    }
    
    console.log("Validation successful!",data);
    return true; // Return true to signal success
}

    return (
        <>
            <div>
            <input 
                type="file" 
                ref={fileRef}
                accept=".xlsx,.xls,.csv"
                disabled={loading}
            />
            <button type='button' className="darkButton" onClick={handleFileRead} disabled={loading}>
                {loading ? 'Reading...' : 'Read File'}
            </button>
            </div>
            {data && <button type='button' className="darkButton" onClick={handleReset}>Reset</button>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
    );
}
