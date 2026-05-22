package app.tomodict.editor;

import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "TomodictBilling")
public class TomodictBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "TomodictBilling";
    /** Must match Play Console and src/lib/googlePlay.ts */
    public static final String PRODUCT_REMOVE_ADS = "remove_ads";

    private BillingClient billingClient;
    private boolean billingReady;
    @Nullable
    private ProductDetails removeAdsProduct;
    @Nullable
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        billingClient =
            BillingClient
                .newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();
        startBillingConnection();
    }

    private void startBillingConnection() {
        billingClient.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        billingReady = true;
                        queryRemoveAdsProduct(null);
                        injectTomodictBillingBridge();
                    } else {
                        Log.w(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    billingReady = false;
                    removeAdsProduct = null;
                }
            }
        );
    }

    private void injectTomodictBillingBridge() {
        String script =
            "(function(){"
                + "if(window.TomodictBilling)return;"
                + "var p=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TomodictBilling;"
                + "if(!p)return;"
                + "window.TomodictBilling={"
                + "purchaseRemoveAds:function(){return p.purchaseRemoveAds().then(function(r){return!!r.owned;});},"
                + "restorePurchases:function(){return p.restorePurchases().then(function(r){return!!r.owned;});}"
                + "};"
                + "})();";
        getBridge()
            .getWebView()
            .post(() -> getBridge().getWebView().evaluateJavascript(script, null));
    }

    @PluginMethod
    public void purchaseRemoveAds(PluginCall call) {
        if (!billingReady) {
            call.reject("Google Play billing is not ready. Try again in a moment.");
            return;
        }
        pendingPurchaseCall = call;
        if (removeAdsProduct != null) {
            launchBillingFlow(call);
            return;
        }
        queryRemoveAdsProduct(
            new Runnable() {
                @Override
                public void run() {
                    if (removeAdsProduct != null) {
                        launchBillingFlow(call);
                    } else if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject(
                            "Product \"" + PRODUCT_REMOVE_ADS + "\" is unavailable. Activate it in Play Console and upload a test build."
                        );
                        pendingPurchaseCall = null;
                    }
                }
            }
        );
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        if (!billingReady) {
            call.reject("Google Play billing is not ready.");
            return;
        }
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams
                .newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build(),
            (billingResult, purchases) -> {
                boolean owned =
                    billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                        && ownsRemoveAds(purchases);
                JSObject ret = new JSObject();
                ret.put("owned", owned);
                call.resolve(ret);
            }
        );
    }

    private void queryRemoveAdsProduct(@Nullable Runnable onDone) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product
            .newBuilder()
            .setProductId(PRODUCT_REMOVE_ADS)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();

        billingClient.queryProductDetailsAsync(
            QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(product)).build(),
            (billingResult, detailsList) -> {
                if (
                    billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                        && detailsList != null
                        && !detailsList.isEmpty()
                ) {
                    removeAdsProduct = detailsList.get(0);
                } else {
                    removeAdsProduct = null;
                    Log.w(
                        TAG,
                        "queryProductDetails failed: "
                            + billingResult.getResponseCode()
                            + " "
                            + billingResult.getDebugMessage()
                    );
                }
                if (onDone != null) {
                    getActivity().runOnUiThread(onDone);
                }
            }
        );
    }

    private void launchBillingFlow(PluginCall call) {
        if (removeAdsProduct == null) {
            call.reject("Remove ads product is not available.");
            pendingPurchaseCall = null;
            return;
        }
        if (removeAdsProduct.getOneTimePurchaseOfferDetails() == null) {
            call.reject("Remove ads product has no purchase offer.");
            pendingPurchaseCall = null;
            return;
        }

        BillingFlowParams.ProductDetailsParams params = BillingFlowParams.ProductDetailsParams
            .newBuilder()
            .setProductDetails(removeAdsProduct)
            .build();

        BillingFlowParams flowParams = BillingFlowParams
            .newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(params))
            .build();

        BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject("Could not start purchase: " + result.getDebugMessage());
            pendingPurchaseCall = null;
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;

        if (call == null) {
            if (purchases != null) {
                for (Purchase purchase : purchases) {
                    handlePurchase(purchase, null);
                }
            }
            return;
        }

        int code = billingResult.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            boolean owned = false;
            for (Purchase purchase : purchases) {
                if (ownsRemoveAdsPurchase(purchase)) {
                    owned = true;
                    handlePurchase(purchase, call);
                }
            }
            if (!owned) {
                resolveOwned(call, false);
            }
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            resolveOwned(call, false);
        } else {
            call.reject("Purchase failed: " + billingResult.getDebugMessage());
        }
    }

    private void handlePurchase(@NonNull Purchase purchase, @Nullable PluginCall call) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            if (call != null) resolveOwned(call, false);
            return;
        }
        if (!ownsRemoveAdsPurchase(purchase)) {
            if (call != null) resolveOwned(call, false);
            return;
        }
        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams
                .newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
            billingClient.acknowledgePurchase(
                params,
                new AcknowledgePurchaseResponseListener() {
                    @Override
                    public void onAcknowledgePurchaseResponse(@NonNull BillingResult billingResult) {
                        if (call != null) {
                            resolveOwned(
                                call,
                                billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                            );
                        }
                    }
                }
            );
        } else if (call != null) {
            resolveOwned(call, true);
        }
    }

    private static void resolveOwned(@NonNull PluginCall call, boolean owned) {
        JSObject ret = new JSObject();
        ret.put("owned", owned);
        call.resolve(ret);
    }

    private static boolean ownsRemoveAds(@Nullable List<Purchase> purchases) {
        if (purchases == null) return false;
        for (Purchase purchase : purchases) {
            if (
                purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
                    && ownsRemoveAdsPurchase(purchase)
            ) {
                return true;
            }
        }
        return false;
    }

    private static boolean ownsRemoveAdsPurchase(@NonNull Purchase purchase) {
        return purchase.getProducts().contains(PRODUCT_REMOVE_ADS);
    }
}
