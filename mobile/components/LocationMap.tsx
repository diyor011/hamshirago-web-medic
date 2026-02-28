import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type LocationMapProps = {
  latitude: number;
  longitude: number;
  onPinChange: (coords: { latitude: number; longitude: number }) => void;
  medics?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>;
  selectedMedicId?: string | null;
  onSelectMedic?: (medicId: string) => void;
};

export function LocationMap({
  latitude,
  longitude,
  onPinChange,
  medics = [],
  selectedMedicId = null,
  onSelectMedic,
}: LocationMapProps) {
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
        {medics.map((medic) => (
          <Marker
            key={medic.id}
            coordinate={{ latitude: medic.latitude, longitude: medic.longitude }}
            title={`🩺 Медик: ${medic.name}`}
            description="Нажмите, чтобы выбрать этого медика"
            pinColor={selectedMedicId === medic.id ? '#ef4444' : '#0d9488'}
            onPress={() => onSelectMedic?.(medic.id)}
          />
        ))}

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
