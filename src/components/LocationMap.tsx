
import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LocationMap = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-butterfly-orange" />
          Como Chegar?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
            {/* 
              Note to user: You'll need to add your Mapbox token here.
              For now, we're showing a placeholder with the event address.
            */}
            <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">
              Mapa será exibido aqui
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Endereço</h3>
              <p className="text-gray-600">Centro de Convenções ExpoCenter</p>
              <p className="text-gray-600">São Paulo - SP</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">Data e Horário</h3>
              <p className="text-gray-600">12 e 13 de Abril de 2025</p>
              <p className="text-gray-600">Das 9h às 18h</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">Como Chegar</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Metrô: Estação XYZ (Linha Vermelha)</li>
                <li>Ônibus: Linhas 123, 456, 789</li>
                <li>Estacionamento disponível no local</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMap;
