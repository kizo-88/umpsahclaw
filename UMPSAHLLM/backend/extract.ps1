param([string]$filePath)
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
    $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
    if ($entry) {
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $xmlText = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $zip.Dispose()
        
        # Simple regex to remove XML tags and clean up spacing
        $cleanText = $xmlText -replace '<w:p[^>]*>', "\n" -replace '<[^>]+>', '' -replace '^\s+', ''
        Write-Output $cleanText
    } else {
        $zip.Dispose()
        Write-Output ""
    }
} catch {
    Write-Error $_.Exception.Message
}
