param([string]$Title)
Add-Type -AssemblyName System.Windows.Forms
$form = New-Object System.Windows.Forms.Form
$form.Text = $Title
$form.Width = 650
$form.Height = 300
$box = New-Object System.Windows.Forms.TextBox
$box.Multiline = $true
$box.Dock = 'Fill'
$box.AccessibleName = 'MCP test input'
$form.Controls.Add($box)
Add-Type 'using System; using System.Runtime.InteropServices; public static class QaWindow { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command); }'
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 300
$timer.Add_Tick({ [QaWindow]::ShowWindow($form.Handle, 5); $form.Activate(); $box.Focus(); $timer.Stop() })
$timer.Start()
[System.Windows.Forms.Application]::Run($form)
