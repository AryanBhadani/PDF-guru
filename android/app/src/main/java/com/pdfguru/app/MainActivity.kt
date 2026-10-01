package com.pdfguru.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var currentPdfUri: Uri? = null
    private var tempPdfFile: File? = null
    private var currentPdfToken: String? = null

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
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false

        // Set up WebViewAssetLoader for secure local file access
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/pdf/", PdfPathHandler())
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url
                if (url != null) {
                    return assetLoader.shouldInterceptRequest(url)
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
        
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val action = intent.action
        val type = intent.type

        when {
            (Intent.ACTION_VIEW == action || Intent.ACTION_SEND == action) && type == "application/pdf" -> {
                val uri = if (Intent.ACTION_SEND == action) {
                    intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                } else {
                    intent.data
                }
                
                if (uri != null) {
                    currentPdfUri = uri
                    loadPdfFromUri(uri)
                } else {
                    loadHomepage()
                }
            }
            else -> loadHomepage()
        }
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
                
                val outputStream = FileOutputStream(tempPdfFile)
                inputStream.copyTo(outputStream, 8192) // Copy in chunks to avoid memory issues
                outputStream.flush()
                outputStream.close()
                inputStream.close()
                
                // Load reader with asset loader URL
                val pdfUrl = "https://pdfassets.local/pdf/$currentPdfToken"
                webView.loadUrl("https://pdf-guru-j5ms-alpha.vercel.app/reader?file=$pdfUrl")
            } else {
                loadHomepage()
            }
        } catch (e: Exception) {
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

    override fun onDestroy() {
        super.onDestroy()
        cleanupTempFile()
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
            if (token == currentPdfToken && tempPdfFile?.exists() == true) {
                try {
                    val inputStream = FileInputStream(tempPdfFile)
                    return WebResourceResponse(
                        "application/pdf",
                        "binary",
                        inputStream
                    )
                } catch (e: Exception) {
                    return null
                }
            }
            return null
        }
    }
}
