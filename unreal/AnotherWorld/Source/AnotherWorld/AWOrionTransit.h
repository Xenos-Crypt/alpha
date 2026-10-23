#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "AWOrionTransit.generated.h"
class AAWCharacter;
class UStaticMeshComponent;
class UPointLightComponent;

UCLASS()
class ANOTHERWORLD_API AAWOrionLine : public AActor
{
    GENERATED_BODY()
public:
    AAWOrionLine();
    virtual void OnConstruction(const FTransform& Transform) override;
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    UFUNCTION(BlueprintCallable) void ConfigureRoute(bool ElevatedTram);
    bool Board(AAWCharacter* Passenger);
    bool Alight();
    AAWCharacter* GetRider() const;
    bool IsTram() const { return bElevatedTram; }
    bool DoorsAreOpen() const { return DoorAmount>.95f; }
    float SpeedCm() const { return Speed; }
    FVector TrainLocation() const;
    FVector BoardingPoint() const;
    float GuidewayErrorCm() const;
    FString ServiceStatus() const;
    void ResetAtCentralStation();
    void EmergencyStop() { bEmergency=true; }
    void SetPowerAvailable(bool Value) { bPower=Value; }
private:
    UPROPERTY(EditAnywhere,Category="Orion") bool bElevatedTram=false;
    UPROPERTY() TObjectPtr<USceneComponent> TrainRoot;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Sections;
    UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Doors;
    UPROPERTY() TObjectPtr<UPointLightComponent> CabinLight;
    TWeakObjectPtr<AAWCharacter> Rider;
    float Position=0,Speed=0,Dwell=8,DoorAmount=1;
    int32 TargetIndex=0;
    bool bEmergency=false,bPower=true;
    void ApplyFleet();
    void Advance(float DT);
    float TargetPosition() const;
};

UCLASS()
class ANOTHERWORLD_API AAWTransitLift : public AActor
{
    GENERATED_BODY()
public:
    AAWTransitLift();
    UPROPERTY(EditAnywhere,Category="Orion") FVector Destination=FVector::ZeroVector;
    UPROPERTY(EditAnywhere,Category="Orion") bool bTramAccess=false;
    bool Travel(AAWCharacter* Passenger);
};
