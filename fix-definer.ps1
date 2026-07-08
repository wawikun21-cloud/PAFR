$content = Get-Content 'C:\wamp64\www\PAFR2.0\PAFR\pafr_database_schema.sql' -Raw -Encoding UTF8
$pattern = 'DEFINER=``root``@``localhost``\s*SQL SECURITY DEFINER\s*'
$content = $content -replace $pattern, ''
Set-Content 'C:\wamp64\www\PAFR2.0\PAFR\pafr_database_fixed.sql' -Value $content -NoNewline -Encoding UTF8
Write-Host "Done. Checking for remaining DEFINER..."
$remaining = Select-String -Path 'C:\wamp64\www\PAFR2.0\PAFR\pafr_database_fixed.sql' -Pattern 'DEFINER'
if ($remaining) {
    Write-Host "WARNING: $($remaining.Count) DEFINER clauses still remain"
} else {
    Write-Host "All DEFINER clauses removed successfully"
}
