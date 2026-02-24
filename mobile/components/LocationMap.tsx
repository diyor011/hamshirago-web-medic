import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type LocationMapProps = {
  latitude: number;
  longitude: number;
  onPinChange: (coords: { latitude: number; longitude: number }) => void;
};

export function LocationMap({ latitude, longitude, onPinChange }: LocationMapProps) {
  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onPress={(e) => onPinChange(e.nativeEvent.coordinate)}
        showsUserLocation
        showsMyLocationButton
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          onDragEnd={(e) => onPinChange(e.nativeEvent.coordinate)}
          title="Адрес вызова"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
