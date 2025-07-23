
import React from 'react';

const LocationMap = () => {
  return (
    <div className="w-full h-72 md:h-80 rounded-lg overflow-hidden">
      <iframe
        src="https://maps.google.com/maps?q=Centro+de+Convenções+ExpoCenter+Norte,São+Paulo,SP&t=&z=15&ie=UTF8&iwloc=&output=embed"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Localização do Evento - Centro de Convenções ExpoCenter"
        className="w-full h-full"
      />
    </div>
  );
};

export default LocationMap;
