package com.seratime.app

import android.view.WindowManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod

@CapacitorPlugin(name = "SecureScreen")
class SecureScreenPlugin : Plugin() {
    @PluginMethod
    fun enable(call: PluginCall) {
        activity.runOnUiThread { activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE) }
        call.resolve(JSObject().put("enabled", true))
    }

    @PluginMethod
    fun disable(call: PluginCall) {
        activity.runOnUiThread { activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
        call.resolve(JSObject().put("enabled", false))
    }
}
