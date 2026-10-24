package app.runinout;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // complementos propios de la app (antes de super.onCreate, que monta el puente)
        registerPlugin(RunNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
