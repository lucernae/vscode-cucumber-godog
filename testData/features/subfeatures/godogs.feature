Feature: eat godogs in subfeature
  In order to be happy
  As a hungry gopher
  I need to be able to eat godogs

  Scenario: Eat 5 out of 120
    Given there are 120 godogs
    When I eat 5
    Then there should be 115 remaining

  Scenario: Eat 0 out of 120
    Given there are 120 godogs
    When I eat 0
    Then there should be 120 remaining