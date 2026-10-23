#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "AWCharacter.generated.h"

class UCameraComponent;
class USpotLightComponent;

UCLASS()
class ANOTHERWORLD_API AAWCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    AAWCharacter();
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    void SetSprinting(bool bEnabled);
    bool IsSprinting() const { return bSprinting; }
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<UCameraComponent> BodyCamera;
    UPROPERTY(VisibleAnywhere) TObjectPtr<USpotLightComponent> Flashlight;
    bool bSprinting = false;
    float StepPhase = 0;
    void MoveForward(float Value);
    void MoveRight(float Value);
    void LookUp(float Value);
    void SprintPressed();
    void SprintReleased();
    void CrouchPressed();
    void CrouchReleased();
    void ToggleFlashlight();
    void UseVehicle();
    void UseTransitLift();
};
