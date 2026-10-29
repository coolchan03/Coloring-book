package io.github.coolchan03.coloringbook

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.ViewGroup
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import java.io.File

/**
 * Hosts the shared web app (the `web/` folder, bundled as assets) in a full-screen WebView.
 * Served from https://appassets.androidplatform.net/ so that fetch(), IndexedDB and canvas
 * behave exactly like they do on the GitHub Pages site.
 */
class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true        // also enables IndexedDB for saved pictures and progress
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            addJavascriptInterface(Bridge(), "AndroidBridge")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false

                override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) = Unit
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    return try {
                        @Suppress("DEPRECATION")
                        startActivityForResult(params.createIntent(), REQUEST_FILE)
                        true
                    } catch (e: android.content.ActivityNotFoundException) {
                        fileCallback = null
                        false
                    }
                }
            }
        }

        // Targeting a recent SDK draws apps edge to edge, so keep the page clear of the system bars.
        val root = FrameLayout(this)
        root.addView(webView, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        root.setOnApplyWindowInsetsListener { v, insets ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                WindowInsets.CONSUMED
            } else {
                @Suppress("DEPRECATION")
                v.setPadding(
                    insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                    insets.systemWindowInsetRight, insets.systemWindowInsetBottom
                )
                insets
            }
        }
        setContentView(root)

        if (savedInstanceState != null) webView.restoreState(savedInstanceState) else webView.loadUrl(START_URL)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        webView.onPause()                            // lets the page's pagehide/visibility handlers save progress
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    // The shared page keeps its screens (launcher, category, coloring page) in browser history,
    // so Back steps back through them and only leaves the app from the launcher.
    @Deprecated("Plain Activity keeps this app dependency-free")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    @Deprecated("Plain Activity keeps this app dependency-free")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_FILE) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        } else {
            @Suppress("DEPRECATION")
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    /** Called from the shared page (window.AndroidBridge) for things a WebView cannot do by itself. */
    private inner class Bridge {
        @JavascriptInterface
        fun saveImage(base64: String, filename: String) {
            val message = try {
                save(Base64.decode(base64, Base64.DEFAULT), filename.replace(Regex("[^\\w.-]"), "_"))
            } catch (e: Exception) {
                getString(R.string.save_failed)
            }
            runOnUiThread { Toast.makeText(this@MainActivity, message, Toast.LENGTH_LONG).show() }
        }
    }

    private fun save(png: ByteArray, name: String): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, name)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/ColoringBook")
            }
            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: error("insert failed")
            contentResolver.openOutputStream(uri)!!.use { it.write(png) }
            return getString(R.string.saved_to_pictures)
        }
        // Older Android: avoid the storage permission by writing to the app's own Pictures folder.
        val dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: filesDir
        File(dir, name).writeBytes(png)
        return getString(R.string.saved_to_folder, dir.absolutePath)
    }

    private companion object {
        const val START_URL = "https://appassets.androidplatform.net/index.html"
        const val REQUEST_FILE = 1
    }
}
