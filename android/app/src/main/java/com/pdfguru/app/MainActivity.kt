package com.pdfguru.app

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.PermissionRequest
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var currentPdfUri: Uri? = null
    private var tempPdfFile: File? = null
    private var currentPdfToken: String? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var fileChooserParams: WebChromeClient.FileChooserParams? = null
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>
    private var tempImageFiles: MutableList<File> = mutableListOf()

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
        private const val CAMERA_PERMISSION_REQUEST_CODE = 1002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.loadWithOverviewMode = true
        webView.settings.useWideViewPort = true
        webView.settings.builtInZoomControls = true
        webView.settings.displayZoomControls = false
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true

        // Set up file chooser launcher
        fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            Log.d("PDFGuru", "File chooser result: resultCode=${result.resultCode}")
            
            if (result.resultCode == Activity.RESULT_OK) {
                val data = result.data
                val results = if (data != null) {
                    val clipData = data.clipData
                    if (clipData != null) {
                        // Multiple files selected
                        val uris = mutableListOf<Uri>()
                        for (i in 0 until clipData.itemCount) {
                            val originalUri = clipData.getItemAt(i).uri
                            val fileUri = copyUriToTempFile(originalUri)
                            if (fileUri != null) {
                                uris.add(fileUri)
                            }
                        }
                        Log.d("PDFGuru", "Multiple files selected: ${uris.size}")
                        uris.toTypedArray()
                    } else {
                        // Single file selected
                        val uri = data.data
                        if (uri != null) {
                            Log.d("PDFGuru", "Single file selected: $uri")
                            val fileUri = copyUriToTempFile(uri)
                            if (fileUri != null) {
                                arrayOf(fileUri)
                            } else {
                                null
                            }
                        } else {
                            null
                        }
                    }
                } else {
                    null
                }
                filePathCallback?.onReceiveValue(results)
                filePathCallback = null
            } else {
                Log.d("PDFGuru", "File chooser cancelled or failed")
                filePathCallback?.onReceiveValue(null)
                filePathCallback = null
            }
        }

        // Set up WebViewAssetLoader for secure local file access
        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("pdfassets.local")
            .setHttpAllowed(true)
            .addPathHandler("/pdf/", PdfPathHandler())
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url
                if (url != null) {
                    Log.d("PDFGuru", "Intercepting request: $url")
                    val response = assetLoader.shouldInterceptRequest(url)
                    Log.d("PDFGuru", "Asset loader response: ${if (response != null) "SUCCESS" else "NULL"}")
                    return response
                }
                return null
            }

            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                // Allow HTTPS URLs to load normally
                if (url?.startsWith("https://") == true) {
                    return false
                }
                // Allow asset loader URLs
                if (url?.startsWith("https://pdfassets.local/") == true) {
                    return false
                }
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                Log.d("PDFGuru", "Permission request: ${request.resources.joinToString()}")
                // Grant camera and microphone permissions for getUserMedia
                val resources = request.resources
                if (resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ||
                    resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                    Log.d("PDFGuru", "Granting camera/mic permission")
                    request.grant(resources)
                } else {
                    Log.d("PDFGuru", "Denying permission request")
                    request.deny()
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams
            ): Boolean {
                Log.d("PDFGuru", "onShowFileChooser called")
                Log.d("PDFGuru", "Accept types: ${params.acceptTypes?.joinToString()}")
                Log.d("PDFGuru", "Is capture enabled: ${params.isCaptureEnabled}")
                Log.d("PDFGuru", "Mode: ${params.mode}")

                // Cancel previous callback if exists
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                this@MainActivity.fileChooserParams = params

                // Check if this is a camera capture request
                if (params.isCaptureEnabled) {
                    Log.d("PDFGuru", "Camera capture requested")
                    // Check camera permission
                    if (ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            android.Manifest.permission.CAMERA
                        ) != PackageManager.PERMISSION_GRANTED
                    ) {
                        Log.d("PDFGuru", "Camera permission not granted, requesting")
                        requestPermissions(
                            arrayOf(android.Manifest.permission.CAMERA),
                            CAMERA_PERMISSION_REQUEST_CODE
                        )
                        return true
                    }
                }

                // Create intent for file chooser
                val intent = params.createIntent()
                
                try {
                    fileChooserLauncher.launch(intent)
                    return true
                } catch (e: Exception) {
                    Log.e("PDFGuru", "Error launching file chooser", e)
                    filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    this@MainActivity.fileChooserParams = null
                    return false
                }
            }
        }
        
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            CAMERA_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.d("PDFGuru", "Camera permission granted")
                    // Retry the file chooser with camera
                    fileChooserParams?.let { params ->
                        val intent = params.createIntent()
                        try {
                            fileChooserLauncher.launch(intent)
                        } catch (e: Exception) {
                            Log.e("PDFGuru", "Error relaunching file chooser after permission grant", e)
                            filePathCallback?.onReceiveValue(null)
                            filePathCallback = null
                            fileChooserParams = null
                        }
                    }
                } else {
                    Log.d("PDFGuru", "Camera permission denied")
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = null
                    fileChooserParams = null
                }
            }
        }
    }

    private fun handleIntent(intent: Intent) {
        val action = intent.action
        val type = intent.type

        when {
            (Intent.ACTION_VIEW == action || Intent.ACTION_SEND == action) -> {
                val uri = if (Intent.ACTION_SEND == action) {
                    intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                } else {
                    intent.data
                }
                
                if (uri != null) {
                    // Validate URI has PDF extension or MIME type
                    val isPdf = isValidPdfUri(uri, type)
                    if (isPdf) {
                        currentPdfUri = uri
                        loadPdfFromUri(uri)
                    } else {
                        loadHomepage()
                    }
                } else {
                    loadHomepage()
                }
            }
            else -> loadHomepage()
        }
    }

    private fun isValidPdfUri(uri: Uri, mimeType: String?): Boolean {
        // Check MIME type if present
        if (mimeType == "application/pdf") {
            return true
        }
        
        // Check for application/octet-stream with PDF extension
        if (mimeType == "application/octet-stream") {
            val path = uri.path ?: return false
            return path.lowercase().endsWith(".pdf")
        }
        
        // If MIME type is null or unknown, check file extension
        if (mimeType == null || mimeType.isEmpty()) {
            val path = uri.path ?: return false
            return path.lowercase().endsWith(".pdf")
        }
        
        return false
    }

    private fun loadHomepage() {
        webView.loadUrl("https://pdf-guru-j5ms-alpha.vercel.app/")
    }

    private fun loadPdfFromUri(uri: Uri) {
        try {
            // Clean up previous temp file if exists
            cleanupTempFile()

            val inputStream = contentResolver.openInputStream(uri)
            if (inputStream != null) {
                // Create unique temp file in cacheDir
                currentPdfToken = UUID.randomUUID().toString()
                tempPdfFile = File(cacheDir, "pdf_$currentPdfToken.pdf")
                
                Log.d("PDFGuru", "Generated token: $currentPdfToken")
                Log.d("PDFGuru", "Temp file path: ${tempPdfFile?.absolutePath}")
                
                val outputStream = FileOutputStream(tempPdfFile)
                inputStream.copyTo(outputStream, 8192) // Copy in chunks to avoid memory issues
                outputStream.flush()
                outputStream.close()
                inputStream.close()
                
                Log.d("PDFGuru", "Temp file exists: ${tempPdfFile?.exists()}")
                Log.d("PDFGuru", "Temp file size: ${tempPdfFile?.length()}")
                
                // Load reader with asset loader URL
                val pdfUrl = "https://pdfassets.local/pdf/$currentPdfToken"
                val readerUrl = "https://pdf-guru-j5ms-alpha.vercel.app/reader?file=$pdfUrl"
                Log.d("PDFGuru", "Loading reader URL: $readerUrl")
                Log.d("PDFGuru", "PDF asset URL: $pdfUrl")
                webView.loadUrl(readerUrl)
            } else {
                Log.e("PDFGuru", "Failed to open input stream for URI: $uri")
                loadHomepage()
            }
        } catch (e: Exception) {
            Log.e("PDFGuru", "Error loading PDF from URI", e)
            cleanupTempFile()
            loadHomepage()
        }
    }

    private fun cleanupTempFile() {
        try {
            tempPdfFile?.delete()
            tempPdfFile = null
            currentPdfToken = null
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
    }

    private fun copyUriToTempFile(uri: Uri): Uri? {
        return try {
            val inputStream: InputStream = contentResolver.openInputStream(uri) ?: return null
            val extension = getFileExtension(uri)
            val tempFile = File(cacheDir, "img_${UUID.randomUUID()}.$extension")
            tempImageFiles.add(tempFile)
            
            val outputStream = FileOutputStream(tempFile)
            inputStream.copyTo(outputStream, 8192)
            outputStream.flush()
            outputStream.close()
            inputStream.close()
            
            Log.d("PDFGuru", "Copied URI to temp file: ${tempFile.absolutePath}")
            Uri.fromFile(tempFile)
        } catch (e: Exception) {
            Log.e("PDFGuru", "Failed to copy URI to temp file", e)
            null
        }
    }

    private fun getFileExtension(uri: Uri): String {
        val mimeType = contentResolver.getType(uri)
        if (mimeType != null) {
            return when (mimeType) {
                "image/jpeg" -> "jpg"
                "image/png" -> "png"
                "image/webp" -> "webp"
                "image/gif" -> "gif"
                else -> "jpg"
            }
        }
        
        // Fallback to path extension
        val path = uri.path ?: return "jpg"
        val lastDot = path.lastIndexOf('.')
        return if (lastDot != -1 && lastDot < path.length - 1) {
            path.substring(lastDot + 1).lowercase()
        } else {
            "jpg"
        }
    }

    private fun cleanupTempImageFiles() {
        try {
            tempImageFiles.forEach { it.delete() }
            tempImageFiles.clear()
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cleanupTempFile()
        cleanupTempImageFiles()
        webView.destroy()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // Custom path handler to serve PDF files from cacheDir
    private inner class PdfPathHandler : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val token = path.removePrefix("/")
            Log.d("PDFGuru", "PdfPathHandler called with path: $path, token: $token")
            Log.d("PDFGuru", "Expected token: $currentPdfToken")
            Log.d("PDFGuru", "Token match: ${token == currentPdfToken}")
            Log.d("PDFGuru", "Temp file exists: ${tempPdfFile?.exists()}")
            
            if (token == currentPdfToken && tempPdfFile?.exists() == true) {
                try {
                    val inputStream = FileInputStream(tempPdfFile)
                    Log.d("PDFGuru", "Returning WebResourceResponse with PDF stream")
                    return WebResourceResponse(
                        "application/pdf",
                        "binary",
                        inputStream
                    )
                } catch (e: Exception) {
                    Log.e("PDFGuru", "Error creating WebResourceResponse", e)
                    return null
                }
            }
            Log.w("PDFGuru", "PdfPathHandler returning null - token mismatch or file not found")
            return null
        }
    }
}
