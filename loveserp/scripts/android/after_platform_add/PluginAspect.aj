package org.apache.cordova;


import android.util.Log;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public aspect PluginAspect {

        private String currentURL = null;

    CordovaPlugin around(String service) : call(CordovaPlugin PluginManager.getPlugin(String)) && args(service)
    {
        // Make sure settings is loaded
        if (service != null && service.equals("SMPSettingsExchangePlugin")) {
            return proceed(service);
        }
        else {
            proceed("SMPSettingsExchangePlugin");
        }

        CordovaPlugin p = null;

         Class settingsClass = null;
         try {
                settingsClass = Class.forName("com.sap.mp.settingsexchange.SettingsExchange");
                Method isFeatureEnabledMethod = settingsClass.getMethod("isFeatureEnabled", String.class, String.class);
                Boolean value = (Boolean)isFeatureEnabledMethod.invoke(settingsClass,service, currentURL);
                if (value.booleanValue() == true) {
                      p = proceed(service);
                      Log.i("FEATUREVECTOR", "Checking for  " + service + " OK ");

                 } else {
                    p = null;
                    Log.i("FEATUREVECTOR", "Checking for "+ service + " denied");
                 }
         } catch (ClassNotFoundException e) {
                Log.i("FEATUREVECTOR","Could not load settings exchange library");
                p = proceed(service);
         } catch (NoSuchMethodException e) {
                 Log.i("FEATUREVECTOR","Could not find requested method");
         } catch (InvocationTargetException e) {
                 Log.i("FEATUREVECTOR","Error Invoking the method");
         } catch (IllegalAccessException e) {
                 Log.i("FEATUREVECTOR","Error Accessing the method");
         }

         return p;

    }

    before(String url) : execution(void org.apache.cordova.CordovaWebViewImpl.EngineClient.onPageFinishedLoading(String)) && args(url)
    {
                currentURL = url;


    }

/*
   before(String url, boolean recreatePlugins) : call(void CordovaWebView.loadUrlIntoView(String, boolean)) && args(url, recreatePlugins)

        {
            currentURL = url;
  
        }
*/
}
