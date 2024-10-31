import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import Cookies from "js-cookie";

interface PlantingData {
  count: number; // количество деревьев
  action: string; // высадка или вырубка
  coordinates: number[][]; // массив координат [lat, lng]
}

const MapComponent: React.FC = () => {
  const map = useMap();
  const [plantingRecords, setPlantingRecords] = useState<PlantingData[]>([]);
  const [count, setCount] = useState<number>(0);
  const [action, setAction] = useState<string>(""); // "planting" или "cutting"
  const [currentLayer, setCurrentLayer] = useState<L.Layer | null>(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#ff6699",
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
      },
    });

    map.addControl(drawControl);

    // Загружаем данные из cookies и восстанавливаем объекты
    const savedData = Cookies.get("plantingRecords");
    if (savedData) {
      const records: PlantingData[] = JSON.parse(savedData);
      setPlantingRecords(records);

      records.forEach((record) => {
        const polygon = L.polygon(
          record.coordinates.map((coords) => [coords[0], coords[1]]), // [lat, lng]
          {
            color: "#ff6699",
          }
        ).addTo(map);

        const tooltipContent = `
          <strong>Количество деревьев:</strong> ${record.count}<br/>
          <strong>Действие:</strong> ${
            record.action === "planting" ? "Высадка" : "Вырубка"
          }<br/>
          <strong>Площадь:</strong> ${L.GeometryUtil.geodesicArea(
            polygon.getLatLngs()[0]
          ).toFixed(2)} м²
        `;
        polygon
          .bindTooltip(tooltipContent, { permanent: true, direction: "top" })
          .openTooltip();
      });
    }

    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);

      // Сохраняем координаты в формате [lat, lng]
      const coordinates: number[][] = layer
        .getLatLngs()[0]
        .map((latLng: L.LatLng) => [latLng.lat, latLng.lng]);

      // Устанавливаем текущий слой для редактирования
      setCurrentLayer(layer);
      setCount(0);
      setAction(""); // Сброс действия

      // Создаем объект с данными
      const record: PlantingData = {
        count: 0, // Начальное значение для нового полигона
        action: "",
        coordinates,
      };

      // Обновляем состояние и сохраняем в cookies
      setPlantingRecords((prev) => {
        const updatedRecords = [...prev, record];
        Cookies.set("plantingRecords", JSON.stringify(updatedRecords), {
          expires: 7,
        }); // Сохранение на 7 дней
        return updatedRecords;
      });

      console.log("Нарисованный объект:", record);
    });

    return () => {
      map.off(L.Draw.Event.CREATED);
      map.removeControl(drawControl);
    };
  }, [map]);

  // Обработка изменений количества деревьев
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCount(Number(e.target.value));
  };

  // Обработка выбора действия (высадка или вырубка)
  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAction(e.target.value);
  };

  // Обработка отправки формы
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (currentLayer) {
      const tooltipContent = `
        <strong>Количество деревьев:</strong> ${count}<br/>
        <strong>Действие:</strong> ${
          action === "planting" ? "Высадка" : "Вырубка"
        }<br/>
        <strong>Площадь:</strong> ${L.GeometryUtil.geodesicArea(
          currentLayer.getLatLngs()[0]
        ).toFixed(2)} м²
      `;
      currentLayer
        .bindTooltip(tooltipContent, { permanent: true, direction: "top" })
        .openTooltip();

      // Сохранение данных
      setPlantingRecords((prev) => {
        const updatedRecords = prev.map((record) => {
          if (
            record.coordinates.toString() ===
            currentLayer
              .getLatLngs()[0]
              .map((latLng: L.LatLng) => [latLng.lat, latLng.lng])
              .toString()
          ) {
            return { ...record, count, action }; // Обновление количества и действия для существующего полигона
          }
          return record;
        });

        Cookies.set("plantingRecords", JSON.stringify(updatedRecords), {
          expires: 7,
        }); // Сохранение на 7 дней
        return updatedRecords;
      });
    }

    // Сброс значений после сохранения
    setCount(0);
    setAction("");
    setCurrentLayer(null); // Убираем текущий слой
  };

  return (
    <div className="map-component">
      <form onSubmit={handleSubmit} className="planting-form">
        <div>
          <label>
            Количество деревьев:
            <input
              type="number"
              value={count}
              onChange={handleCountChange}
              min="0"
              required
            />
          </label>
        </div>
        <div>
          <label>
            Действие:
            <select value={action} onChange={handleActionChange} required>
              <option value="">Выберите действие</option>
              <option value="planting">Высадка</option>
              <option value="cutting">Вырубка</option>
            </select>
          </label>
        </div>
        <button type="submit">Сохранить</button>
      </form>
    </div>
  );
};

const MapContainerComponent: React.FC = () => {
  return (
    <div className="full-map">
      <MapContainer
        center={[53.283, 69.396]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }} // Изменяем высоту карты на 100% высоты окна
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapComponent />
      </MapContainer>
    </div>
  );
};

export default MapContainerComponent;
